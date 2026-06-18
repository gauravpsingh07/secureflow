'use server';

import { revalidatePath } from 'next/cache';
import { getTenantDb } from '@/lib/db/tenant';
import { requireRole } from '@/lib/auth/session';
import { isRiskyAction, type RiskyActionKey } from '@/lib/approvals/catalog';
import { audit } from '@/lib/audit';
import type { TenantDb } from '@/lib/db/tenant';

/** File a request for a risky action. Any non-viewer can request; an owner approves. */
export async function requestApprovalAction(formData: FormData): Promise<void> {
  const actor = await requireRole(['OWNER', 'ADMIN', 'ANALYST']);
  const action = String(formData.get('action') ?? '');
  if (!isRiskyAction(action)) return;
  const note = String(formData.get('note') ?? '').slice(0, 280) || null;

  await getTenantDb(actor.tenantId).approvalRequest.create({
    data: {
      tenantId: actor.tenantId,
      action,
      note,
      requestedById: actor.userId,
      requestedByName: actor.name,
    },
  });
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    actorName: actor.name,
    action: 'approval.request',
    target: action,
  });
  revalidatePath('/settings/approvals');
}

/** Approve (and execute) or deny a pending request. Owners only. */
export async function decideApprovalAction(formData: FormData): Promise<void> {
  const actor = await requireRole(['OWNER']);
  const id = String(formData.get('requestId') ?? '');
  const decision = String(formData.get('decision') ?? '');
  if (!id || (decision !== 'approve' && decision !== 'deny')) return;

  const db = getTenantDb(actor.tenantId);
  const request = await db.approvalRequest.findFirst({ where: { id, status: 'PENDING' } });
  if (!request) return;

  if (decision === 'approve' && isRiskyAction(request.action)) {
    await executeRiskyAction(db, request.action);
  }

  await db.approvalRequest.updateMany({
    where: { id, status: 'PENDING' },
    data: {
      status: decision === 'approve' ? 'APPROVED' : 'DENIED',
      decidedById: actor.userId,
      decidedByName: actor.name,
      decidedAt: new Date(),
    },
  });
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    actorName: actor.name,
    action: 'approval.decide',
    target: request.action,
    metadata: { decision },
  });
  revalidatePath('/settings/approvals');
  revalidatePath('/alerts');
  revalidatePath('/settings/api-keys');
}

async function executeRiskyAction(db: TenantDb, action: RiskyActionKey): Promise<void> {
  if (action === 'revoke_all_api_keys') {
    await db.apiKey.updateMany({ where: { revokedAt: null }, data: { revokedAt: new Date() } });
  } else if (action === 'bulk_resolve_alerts') {
    await db.alert.updateMany({ where: { status: { not: 'RESOLVED' } }, data: { status: 'RESOLVED' } });
  }
}
