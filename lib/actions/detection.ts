'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/session';
import { runDetection } from '@/lib/detection/run';
import { isDemoMode } from '@/lib/demo';

/** Run a detection pass for the current tenant in-process (drives the live feed). */
export async function runDetectionNowAction(): Promise<void> {
  const actor = await requireRole(['OWNER', 'ADMIN', 'ANALYST']);
  if (isDemoMode()) return;
  await runDetection(actor.tenantId);
  revalidatePath('/alerts');
  revalidatePath('/dashboard');
}
