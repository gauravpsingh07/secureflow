import { prisma } from '@/lib/db/client';
import { signatureHeader } from './sign';
import { planNextAttempt } from './retry';
import type { Prisma } from '@/lib/generated/prisma/client';

export type AlertWebhookEvent = {
  alertId: string;
  detectorKey: string;
  severity: string;
  title: string;
  explanation: string;
  score: number;
};

const EVENT_TYPE = 'alert.created';
const TIMEOUT_MS = 10_000;

/** Queue a delivery for every enabled endpoint. Idempotent via (endpointId, eventKey). */
export async function enqueueAlertDeliveries(
  tenantId: string,
  event: AlertWebhookEvent,
): Promise<void> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { tenantId, enabled: true },
    select: { id: true },
  });
  if (endpoints.length === 0) return;

  await prisma.webhookDelivery.createMany({
    data: endpoints.map((e) => ({
      tenantId,
      endpointId: e.id,
      eventType: EVENT_TYPE,
      eventKey: event.alertId,
      payload: event as unknown as Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  });
}

type DeliveryForSend = { id: string; eventType: string; createdAt: Date; payload: unknown };
type EndpointForSend = { url: string; secret: string };
type AttemptResult = { ok: boolean; statusCode?: number; error?: string };

/** Make one signed POST attempt to the endpoint. */
async function attemptDelivery(
  endpoint: EndpointForSend,
  delivery: DeliveryForSend,
  fetchImpl: typeof fetch = fetch,
): Promise<AttemptResult> {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({
    id: delivery.id, // stable idempotency key across retries
    type: delivery.eventType,
    createdAt: delivery.createdAt.toISOString(),
    data: delivery.payload,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SecureFlow-Webhooks/1.0',
        'X-SecureFlow-Event': delivery.eventType,
        'X-SecureFlow-Delivery': delivery.id,
        'X-SecureFlow-Signature': signatureHeader(endpoint.secret, timestamp, body),
      },
      body,
      signal: controller.signal,
    });
    return { ok: res.ok, statusCode: res.status };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'request failed' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Attempt all deliveries that are due. Applies the retry plan to each row:
 * success → SUCCESS, failure → re-queued with backoff until attempts are exhausted.
 */
export async function processPendingDeliveries(
  opts: { tenantId?: string; limit?: number; fetchImpl?: typeof fetch } = {},
): Promise<{ attempted: number; delivered: number }> {
  const now = new Date();
  const due = await prisma.webhookDelivery.findMany({
    where: {
      status: 'PENDING',
      nextAttemptAt: { lte: now },
      ...(opts.tenantId ? { tenantId: opts.tenantId } : {}),
    },
    include: { endpoint: true },
    orderBy: { nextAttemptAt: 'asc' },
    take: opts.limit ?? 50,
  });

  let delivered = 0;
  for (const d of due) {
    if (!d.endpoint.enabled) {
      await prisma.webhookDelivery.update({
        where: { id: d.id },
        data: { status: 'FAILED', lastError: 'endpoint disabled' },
      });
      continue;
    }

    const result = await attemptDelivery(d.endpoint, d, opts.fetchImpl);
    const plan = planNextAttempt(d.attempts, result.ok);
    await prisma.webhookDelivery.update({
      where: { id: d.id },
      data: {
        status: plan.status,
        attempts: plan.attempts,
        lastStatusCode: result.statusCode ?? null,
        lastError: result.error ?? null,
        nextAttemptAt:
          plan.nextAttemptInSeconds != null
            ? new Date(now.getTime() + plan.nextAttemptInSeconds * 1000)
            : d.nextAttemptAt,
        deliveredAt: plan.status === 'SUCCESS' ? new Date() : null,
      },
    });
    if (plan.status === 'SUCCESS') delivered++;
  }

  return { attempted: due.length, delivered };
}
