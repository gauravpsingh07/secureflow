import { prisma } from '@/lib/db/client';
import { getTenantDb } from '@/lib/db/tenant';
import { detectors } from './registry';
import { persistResults } from './persist';
import type { DetectionContext, DetectionResult, DetectorEvent } from './types';

const DAY = 86_400_000;
const BASELINE_DAYS = 7;

function windowMinutes(): number {
  const n = Number(process.env.DETECTION_WINDOW_MINUTES);
  return Number.isFinite(n) && n > 0 ? n : 15;
}

export type DetectionRunSummary = {
  tenantId: string;
  scanned: number;
  windowEvents: number;
  findings: number;
  created: number;
  updated: number;
};

/**
 * Run every detector for one tenant over the recent window (with a baseline
 * lookback for the statistical detectors) and persist the findings as alerts.
 */
export async function runDetection(tenantId: string, now = new Date()): Promise<DetectionRunSummary> {
  const mins = windowMinutes();
  const windowStart = new Date(now.getTime() - mins * 60_000);
  const lookbackStart = new Date(now.getTime() - BASELINE_DAYS * DAY);

  const rows = await getTenantDb(tenantId).securityEvent.findMany({
    where: { occurredAt: { gte: lookbackStart, lte: now } },
    orderBy: { occurredAt: 'asc' },
  });

  const all: DetectorEvent[] = rows.map((r) => ({
    id: r.id,
    type: r.type,
    actorEmail: r.actorEmail,
    ip: r.ip,
    country: r.country,
    city: r.city,
    latitude: r.latitude,
    longitude: r.longitude,
    userAgent: r.userAgent,
    success: r.success,
    occurredAt: r.occurredAt,
  }));

  const events = all.filter((e) => e.occurredAt >= windowStart);
  const baseline = all.filter((e) => e.occurredAt < windowStart);
  const ctx: DetectionContext = { tenantId, now, windowStart, windowMinutes: mins, events, baseline };

  const findings: DetectionResult[] = [];
  for (const d of detectors) {
    try {
      findings.push(...d.run(ctx));
    } catch (err) {
      console.error(`[detection] detector "${d.key}" threw`, err);
    }
  }

  const { created, updated } = await persistResults(tenantId, findings);
  return { tenantId, scanned: all.length, windowEvents: events.length, findings: findings.length, created, updated };
}

/** Run detection for every tenant (used by the worker loop and the cron route). */
export async function runDetectionAllTenants(now = new Date()): Promise<DetectionRunSummary[]> {
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  const summaries: DetectionRunSummary[] = [];
  for (const t of tenants) summaries.push(await runDetection(t.id, now));
  return summaries;
}
