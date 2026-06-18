'use server';

import { revalidatePath } from 'next/cache';
import { getTenantDb } from '@/lib/db/tenant';
import { requireActor } from '@/lib/auth/session';
import { isDemoMode } from '@/lib/demo';

/** Mark every unread notification for the tenant as read. */
export async function markAllNotificationsReadAction(): Promise<void> {
  const actor = await requireActor();
  if (isDemoMode()) return;
  await getTenantDb(actor.tenantId).notification.updateMany({
    where: { readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath('/notifications');
}
