import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db/client';
import { enqueueAlertDeliveries, processPendingDeliveries } from '@/lib/webhooks/deliver';

// Hits a real Postgres (DATABASE_URL). Run with `pnpm test:int`.
// Drives the delivery loop with an injected fetch to verify success and retry.

const SUFFIX = `wh-${Date.now()}`;
let tenantId = '';

beforeAll(async () => {
  const t = await prisma.tenant.create({
    data: {
      name: `WH ${SUFFIX}`,
      slug: `wh-${SUFFIX}`,
      webhookEndpoints: { create: { url: 'https://example.test/hook', secret: 'whsec_test' } },
    },
  });
  tenantId = t.id;
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { slug: `wh-${SUFFIX}` } });
  await prisma.$disconnect();
});

const okFetch = (async () => new Response(null, { status: 200 })) as unknown as typeof fetch;
const failFetch = (async () => new Response(null, { status: 500 })) as unknown as typeof fetch;

function event(key: string) {
  return { alertId: key, detectorKey: 'x', severity: 'HIGH', title: 't', explanation: 'e', score: 50 };
}

describe('webhook delivery', () => {
  it('marks a delivery SUCCESS on a 2xx response', async () => {
    await enqueueAlertDeliveries(tenantId, event(`${SUFFIX}-ok`));
    const res = await processPendingDeliveries({ tenantId, fetchImpl: okFetch });
    expect(res.delivered).toBeGreaterThanOrEqual(1);

    const d = await prisma.webhookDelivery.findFirst({ where: { tenantId, eventKey: `${SUFFIX}-ok` } });
    expect(d?.status).toBe('SUCCESS');
    expect(d?.attempts).toBe(1);
    expect(d?.deliveredAt).not.toBeNull();
  });

  it('re-queues with backoff on a 5xx response', async () => {
    await enqueueAlertDeliveries(tenantId, event(`${SUFFIX}-fail`));
    await processPendingDeliveries({ tenantId, fetchImpl: failFetch });

    const d = await prisma.webhookDelivery.findFirst({ where: { tenantId, eventKey: `${SUFFIX}-fail` } });
    expect(d?.status).toBe('PENDING');
    expect(d?.attempts).toBe(1);
    expect(d?.lastStatusCode).toBe(500);
    expect((d?.nextAttemptAt.getTime() ?? 0)).toBeGreaterThan(Date.now());
  });
});
