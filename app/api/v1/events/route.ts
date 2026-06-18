import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { getTenantDb } from '@/lib/db/tenant';
import { authenticateApiKey } from '@/lib/ingest/auth';
import { ingestPayloadSchema, toEventArray } from '@/lib/validation/event';
import { normalizeEvent } from '@/lib/ingest/normalize';
import type { Prisma } from '@/lib/generated/prisma/client';

export const dynamic = 'force-dynamic';

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

/**
 * Ingestion endpoint. Authenticate with the `X-API-Key` header, then send a
 * single event, an array, or `{ events: [...] }`.
 */
export async function POST(req: NextRequest) {
  const rawKey = req.headers.get('x-api-key') ?? '';
  const key = await authenticateApiKey(rawKey);
  if (!key) return json({ error: 'Invalid or missing API key' }, 401);

  const payload = await req.json().catch(() => null);
  const parsed = ingestPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return json({ error: 'Invalid event payload', details: parsed.error.issues.slice(0, 5) }, 400);
  }

  const events = toEventArray(parsed.data).map(normalizeEvent);
  await getTenantDb(key.tenantId).securityEvent.createMany({
    data: events.map((e) => ({
      tenantId: key.tenantId,
      type: e.type,
      actorEmail: e.actorEmail,
      ip: e.ip,
      country: e.country,
      city: e.city,
      latitude: e.latitude,
      longitude: e.longitude,
      userAgent: e.userAgent,
      success: e.success,
      occurredAt: e.occurredAt,
      raw: e.raw === null ? undefined : (e.raw as Prisma.InputJsonValue),
    })),
  });
  await prisma.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });

  return json({ ok: true, ingested: events.length }, 201);
}
