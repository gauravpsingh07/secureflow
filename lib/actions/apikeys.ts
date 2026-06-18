'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getTenantDb } from '@/lib/db/tenant';
import { requireRole } from '@/lib/auth/session';
import { generateApiKey } from '@/lib/apikey';
import { audit } from '@/lib/audit';
import { isDemoMode, DEMO_MESSAGE } from '@/lib/demo';

const createSchema = z.object({ name: z.string().min(1, 'Name is required').max(60) });

export type CreateKeyState = { error?: string; rawKey?: string; prefix?: string };

/** Mint a new ingestion key. Returns the raw key once — it's never stored. */
export async function createApiKeyAction(
  _prev: CreateKeyState,
  formData: FormData,
): Promise<CreateKeyState> {
  const actor = await requireRole(['OWNER', 'ADMIN']);
  if (isDemoMode()) return { error: DEMO_MESSAGE };
  const parsed = createSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Name is required.' };
  }

  const { raw, hashed, prefix } = generateApiKey();
  await getTenantDb(actor.tenantId).apiKey.create({
    data: {
      tenantId: actor.tenantId,
      name: parsed.data.name,
      hashedKey: hashed,
      prefix,
      createdBy: actor.userId,
    },
  });
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    actorName: actor.name,
    action: 'apikey.create',
    target: prefix,
  });

  revalidatePath('/settings/api-keys');
  return { rawKey: raw, prefix };
}

/** Revoke a key (soft delete via revokedAt) so it can no longer ingest. */
export async function revokeApiKeyAction(formData: FormData): Promise<void> {
  const actor = await requireRole(['OWNER', 'ADMIN']);
  if (isDemoMode()) return;
  const id = String(formData.get('keyId') ?? '');
  if (!id) return;
  await getTenantDb(actor.tenantId).apiKey.updateMany({
    where: { id, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    actorName: actor.name,
    action: 'apikey.revoke',
    target: id,
  });
  revalidatePath('/settings/api-keys');
}
