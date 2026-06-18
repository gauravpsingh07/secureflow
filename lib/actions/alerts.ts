'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getTenantDb } from '@/lib/db/tenant';
import { requireRole } from '@/lib/auth/session';
import { audit } from '@/lib/audit';
import { isDemoMode } from '@/lib/demo';

const statusSchema = z.enum(['OPEN', 'ACKNOWLEDGED', 'RESOLVED']);

/** Move an alert through its triage workflow. Viewers cannot change status. */
export async function setAlertStatusAction(formData: FormData): Promise<void> {
  const actor = await requireRole(['OWNER', 'ADMIN', 'ANALYST']);
  if (isDemoMode()) return;
  const id = String(formData.get('alertId') ?? '');
  const parsed = statusSchema.safeParse(formData.get('status'));
  if (!id || !parsed.success) return;

  await getTenantDb(actor.tenantId).alert.updateMany({
    where: { id },
    data: { status: parsed.data },
  });
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    actorName: actor.name,
    action: 'alert.status',
    target: id,
    metadata: { status: parsed.data },
  });
  revalidatePath('/alerts');
  revalidatePath(`/alerts/${id}`);
}
