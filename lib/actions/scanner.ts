'use server';

import { redirect } from 'next/navigation';
import { getTenantDb } from '@/lib/db/tenant';
import { requireRole } from '@/lib/auth/session';
import { scan } from '@/lib/scanner/rules';
import { audit } from '@/lib/audit';
import type { Severity } from '@/lib/scanner/types';
import type { AlertSeverity } from '@/lib/generated/prisma/enums';

const SEVERITY: Record<Severity, AlertSeverity> = {
  low: 'LOW',
  medium: 'MEDIUM',
  high: 'HIGH',
  critical: 'CRITICAL',
};

const MAX_BYTES = 200_000;

/** Scan pasted text or an uploaded file for secrets and persist the run. */
export async function scanAction(formData: FormData): Promise<void> {
  const actor = await requireRole(['OWNER', 'ADMIN', 'ANALYST']);

  const file = formData.get('file');
  let text = String(formData.get('text') ?? '');
  let source = 'Pasted input';
  if (file instanceof File && file.size > 0) {
    text = await file.text();
    source = file.name || 'Uploaded file';
  }
  text = text.slice(0, MAX_BYTES);
  if (!text.trim()) return;

  const findings = scan(text);
  const created = await getTenantDb(actor.tenantId).secretScan.create({
    data: {
      tenantId: actor.tenantId,
      source,
      bytesScanned: text.length,
      findingCount: findings.length,
      findings: {
        create: findings.map((f) => ({
          ruleId: f.ruleId,
          ruleName: f.ruleName,
          severity: SEVERITY[f.severity],
          line: f.line,
          column: f.column,
          maskedValue: f.match,
          remediation: f.remediation,
        })),
      },
    },
  });
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    actorName: actor.name,
    action: 'secret.scan',
    target: source,
    metadata: { findingCount: findings.length },
  });
  redirect(`/scanner/${created.id}`);
}
