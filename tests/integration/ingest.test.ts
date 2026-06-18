import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db/client';
import { hashApiKey } from '@/lib/apikey';
import { POST } from '@/app/api/v1/events/route';

// Hits a real Postgres (DATABASE_URL). Run with `pnpm test:int`.
// Exercises the full ingestion path: API-key auth, validation, normalization,
// batch persistence, and tenant scoping.

const SUFFIX = `ing-${Date.now()}`;
const RAW_KEY = `sf_test_${SUFFIX}`;
let tenantId = '';

beforeAll(async () => {
  const t = await prisma.tenant.create({
    data: {
      name: `T ${SUFFIX}`,
      slug: `t-${SUFFIX}`,
      apiKeys: {
        create: { name: 'test', hashedKey: hashApiKey(RAW_KEY), prefix: RAW_KEY.slice(0, 11) },
      },
    },
  });
  tenantId = t.id;
});

afterAll(async () => {
  await prisma.securityEvent.deleteMany({ where: { tenantId } });
  await prisma.tenant.deleteMany({ where: { slug: `t-${SUFFIX}` } });
  await prisma.$disconnect();
});

function request(body: unknown, key?: string): NextRequest {
  return new Request('http://localhost/api/v1/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { 'X-API-Key': key } : {}),
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe('POST /api/v1/events', () => {
  it('rejects a request with no API key', async () => {
    const res = await POST(request({ type: 'LOGIN_SUCCESS' }));
    expect(res.status).toBe(401);
  });

  it('rejects an invalid payload', async () => {
    const res = await POST(request({ type: 'NOPE' }, RAW_KEY));
    expect(res.status).toBe(400);
  });

  it('ingests a batch, normalizing and scoping to the tenant', async () => {
    const res = await POST(
      request(
        {
          events: [
            { type: 'LOGIN_SUCCESS', actorEmail: 'A@X.test' },
            { type: 'LOGIN_FAILURE', ip: '1.2.3.4' },
          ],
        },
        RAW_KEY,
      ),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).ingested).toBe(2);

    const rows = await prisma.securityEvent.findMany({ where: { tenantId } });
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.type === 'LOGIN_SUCCESS')?.actorEmail).toBe('a@x.test');
    expect(rows.find((r) => r.type === 'LOGIN_FAILURE')?.success).toBe(false);
  });
});
