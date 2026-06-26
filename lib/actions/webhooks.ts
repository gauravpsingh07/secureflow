'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getTenantDb } from '@/lib/db/tenant';
import { requireRole } from '@/lib/auth/session';
import { generateWebhookSecret } from '@/lib/webhooks/sign';
import { audit } from '@/lib/audit';
import { isDemoMode, DEMO_MESSAGE } from '@/lib/demo';

const urlSchema = z.object({ url: z.url() });

export type AddWebhookState = { error?: string; secret?: string; url?: string };

/** Create an endpoint and return its signing secret once. */
export async function addWebhookAction(
  _prev: AddWebhookState,
  formData: FormData,
): Promise<AddWebhookState> {
  const actor = await requireRole(['OWNER', 'ADMIN']);
  if (isDemoMode()) return { error: DEMO_MESSAGE };

  const parsed = urlSchema.safeParse({ url: formData.get('url') });
  if (!parsed.success) return { error: 'Enter a valid https URL.' };

  const secret = generateWebhookSecret();
  await getTenantDb(actor.tenantId).webhookEndpoint.create({
    data: { tenantId: actor.tenantId, url: parsed.data.url, secret },
  });
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    actorName: actor.name,
    action: 'webhook.create',
    target: parsed.data.url,
  });
  revalidatePath('/settings/webhooks');
  return { secret, url: parsed.data.url };
}

/** Enable or disable an endpoint. */
export async function toggleWebhookAction(formData: FormData): Promise<void> {
  const actor = await requireRole(['OWNER', 'ADMIN']);
  if (isDemoMode()) return;
  const id = String(formData.get('endpointId') ?? '');
  const enabled = formData.get('enabled') === 'true';
  if (!id) return;
  await getTenantDb(actor.tenantId).webhookEndpoint.updateMany({ where: { id }, data: { enabled } });
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    actorName: actor.name,
    action: 'webhook.toggle',
    target: id,
    metadata: { enabled },
  });
  revalidatePath('/settings/webhooks');
}

/** Delete an endpoint (and its deliveries, via cascade). */
export async function deleteWebhookAction(formData: FormData): Promise<void> {
  const actor = await requireRole(['OWNER', 'ADMIN']);
  if (isDemoMode()) return;
  const id = String(formData.get('endpointId') ?? '');
  if (!id) return;
  await getTenantDb(actor.tenantId).webhookEndpoint.deleteMany({ where: { id } });
  await audit({
    tenantId: actor.tenantId,
    actorId: actor.userId,
    actorName: actor.name,
    action: 'webhook.delete',
    target: id,
  });
  revalidatePath('/settings/webhooks');
}
