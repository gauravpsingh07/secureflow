'use server';

import { revalidatePath } from 'next/cache';
import { getTenantDb } from '@/lib/db/tenant';
import { requireRole } from '@/lib/auth/session';
import { DETECTOR_PARAMS } from '@/lib/detection/config';
import { detectors } from '@/lib/detection/registry';
import type { Prisma } from '@/lib/generated/prisma/client';

/** Enable/disable a detector and persist its threshold overrides for the tenant. */
export async function saveDetectorSettingAction(formData: FormData): Promise<void> {
  const actor = await requireRole(['OWNER', 'ADMIN']);
  const key = String(formData.get('detectorKey') ?? '');
  if (!detectors.some((d) => d.key === key)) return;

  const enabled = formData.get('enabled') != null;
  const config: Record<string, number> = {};
  for (const spec of DETECTOR_PARAMS[key] ?? []) {
    const raw = Number(formData.get(`param_${spec.name}`));
    if (Number.isFinite(raw)) {
      config[spec.name] = Math.min(spec.max, Math.max(spec.min, raw));
    }
  }

  await getTenantDb(actor.tenantId).detectorSetting.upsert({
    where: { tenantId_detectorKey: { tenantId: actor.tenantId, detectorKey: key } },
    create: {
      tenantId: actor.tenantId,
      detectorKey: key,
      enabled,
      config: config as Prisma.InputJsonValue,
    },
    update: { enabled, config: config as Prisma.InputJsonValue },
  });
  revalidatePath('/settings/detection');
}
