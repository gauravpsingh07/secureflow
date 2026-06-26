import { prisma } from '@/lib/db/client';
import { getTenantDb } from '@/lib/db/tenant';
import { publishAlertEvent } from '@/lib/realtime';
import { sendEmail } from '@/lib/notify/email';
import { enqueueAlertDeliveries } from '@/lib/webhooks/deliver';
import type { Prisma } from '@/lib/generated/prisma/client';
import type { AlertSeverity } from '@/lib/generated/prisma/enums';
import type { DetectionResult, Severity } from './types';

const SEVERITY_MAP: Record<Severity, AlertSeverity> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
};

export type PersistSummary = { created: number; updated: number };

/**
 * Persist detection results as alerts. Findings are correlated by `dedupeKey`:
 * a repeat firing updates the existing alert's score/evidence/lastSeen (leaving
 * an analyst's triage status untouched) rather than spawning duplicates. Each
 * alert is linked to the events that triggered it.
 */
export async function persistResults(
  tenantId: string,
  results: DetectionResult[],
): Promise<PersistSummary> {
  const db = getTenantDb(tenantId);
  const now = new Date();
  let created = 0;
  let updated = 0;

  for (const r of results) {
    const severity = SEVERITY_MAP[r.severity];
    const evidence = r.evidence as Prisma.InputJsonValue;
    const existing = await db.alert.findFirst({ where: { dedupeKey: r.dedupeKey } });

    let alertId: string;
    if (existing) {
      await db.alert.update({
        where: { id: existing.id },
        data: { severity, score: r.score, title: r.title, explanation: r.explanation, evidence, lastSeen: now },
      });
      alertId = existing.id;
      updated++;
    } else {
      const alert = await db.alert.create({
        data: {
          tenantId,
          detectorKey: r.detectorKey,
          severity,
          status: 'OPEN',
          title: r.title,
          score: r.score,
          explanation: r.explanation,
          evidence,
          dedupeKey: r.dedupeKey,
          firstSeen: now,
          lastSeen: now,
        },
      });
      alertId = alert.id;
      created++;
      publishAlertEvent(tenantId, {
        type: 'alert',
        alertId: alert.id,
        detectorKey: r.detectorKey,
        severity,
        title: r.title,
      });
      await db.notification.create({
        data: {
          tenantId,
          type: 'alert',
          title: `${severity}: ${r.title}`,
          body: r.explanation,
          alertId: alert.id,
        },
      });
      await sendEmail({ to: 'security-team', subject: `[${severity}] ${r.title}`, body: r.explanation });
      await enqueueAlertDeliveries(tenantId, {
        alertId: alert.id,
        detectorKey: r.detectorKey,
        severity,
        title: r.title,
        explanation: r.explanation,
        score: r.score,
      });
    }

    if (r.eventIds.length > 0) {
      // AlertEvent is a join table with no tenantId; rows are tenant-correct by
      // construction (alert + events both belong to this tenant).
      await prisma.alertEvent.createMany({
        data: r.eventIds.map((securityEventId) => ({ alertId, securityEventId })),
        skipDuplicates: true,
      });
    }
  }

  return { created, updated };
}
