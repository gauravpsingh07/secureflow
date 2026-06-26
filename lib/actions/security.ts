'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/client';
import { getTenantDb } from '@/lib/db/tenant';
import { requireActor } from '@/lib/auth/session';
import { generateMfaSecret, otpauthUri, verifyTotp } from '@/lib/auth/totp';
import { audit } from '@/lib/audit';
import { isDemoMode, DEMO_MESSAGE } from '@/lib/demo';

export type MfaSetupState = { error?: string; secret?: string; uri?: string };

/** Generate a secret and store it (not yet enabled) so the user can confirm a code. */
export async function beginMfaSetupAction(): Promise<MfaSetupState> {
  const actor = await requireActor();
  if (isDemoMode()) return { error: DEMO_MESSAGE };

  const secret = generateMfaSecret();
  await getTenantDb(actor.tenantId).user.updateMany({
    where: { id: actor.userId },
    data: { mfaSecret: secret, mfaEnabled: false },
  });
  return { secret, uri: otpauthUri(secret, actor.email) };
}

export type ConfirmMfaState = { error?: string };

/** Verify a code against the pending secret and turn MFA on. */
export async function confirmMfaAction(
  _prev: ConfirmMfaState,
  formData: FormData,
): Promise<ConfirmMfaState> {
  const actor = await requireActor();
  if (isDemoMode()) return { error: DEMO_MESSAGE };

  const token = String(formData.get('token') ?? '');
  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { mfaSecret: true },
  });
  if (!user?.mfaSecret) return { error: 'Start setup first.' };
  if (!verifyTotp(user.mfaSecret, token)) {
    return { error: 'That code is incorrect — try again.' };
  }

  await getTenantDb(actor.tenantId).user.updateMany({
    where: { id: actor.userId },
    data: { mfaEnabled: true },
  });
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    actorName: actor.name,
    action: 'mfa.enable',
  });
  revalidatePath('/settings/security');
  return {};
}

/** Turn MFA off and clear the secret. */
export async function disableMfaAction(): Promise<void> {
  const actor = await requireActor();
  if (isDemoMode()) return;

  await getTenantDb(actor.tenantId).user.updateMany({
    where: { id: actor.userId },
    data: { mfaEnabled: false, mfaSecret: null },
  });
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    actorName: actor.name,
    action: 'mfa.disable',
  });
  revalidatePath('/settings/security');
}
