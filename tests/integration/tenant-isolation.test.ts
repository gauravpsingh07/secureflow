import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db/client';
import { getTenantDb } from '@/lib/db/tenant';
import { withTenantRls } from '@/lib/db/rls';

// Hits a real Postgres (DATABASE_URL). Run with `pnpm test:int`.
// Proves both isolation layers: the application query-scope (lib/db/tenant.ts)
// and the Postgres RLS policies (lib/db/rls.ts + the *_rls migration).

const SUFFIX = `it-${Date.now()}`;
let tenantA = '';
let userBId = '';

beforeAll(async () => {
  const a = await prisma.tenant.create({
    data: {
      name: `A ${SUFFIX}`,
      slug: `a-${SUFFIX}`,
      users: { create: { name: 'A Owner', email: `a-${SUFFIX}@x.test`, passwordHash: 'x', role: 'OWNER' } },
    },
    include: { users: true },
  });
  const b = await prisma.tenant.create({
    data: {
      name: `B ${SUFFIX}`,
      slug: `b-${SUFFIX}`,
      users: { create: { name: 'B Owner', email: `b-${SUFFIX}@x.test`, passwordHash: 'x', role: 'OWNER' } },
    },
    include: { users: true },
  });
  tenantA = a.id;
  userBId = b.users[0].id;
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { slug: { in: [`a-${SUFFIX}`, `b-${SUFFIX}`] } } });
  await prisma.$disconnect();
});

describe('tenant isolation — application layer', () => {
  it('findMany returns only the active tenant rows', async () => {
    const aUsers = await getTenantDb(tenantA).user.findMany();
    expect(aUsers.length).toBe(1);
    expect(aUsers.every((u) => u.tenantId === tenantA)).toBe(true);
  });

  it('cannot read another tenant row by id', async () => {
    const leaked = await getTenantDb(tenantA).user.findUnique({ where: { id: userBId } });
    expect(leaked).toBeNull();
  });

  it('cannot update another tenant row', async () => {
    const res = await getTenantDb(tenantA).user.updateMany({
      where: { id: userBId },
      data: { name: 'hacked' },
    });
    expect(res.count).toBe(0);
  });
});

describe('tenant isolation — RLS layer', () => {
  it('hides another tenant row when the GUC is set', async () => {
    const visibleB = await withTenantRls(tenantA, async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE id = ${userBId}`;
      return rows.length;
    });
    expect(visibleB).toBe(0);
  });

  it('still shows the active tenant rows when the GUC is set', async () => {
    const visibleOwn = await withTenantRls(tenantA, async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE "tenantId" = ${tenantA}`;
      return rows.length;
    });
    expect(visibleOwn).toBe(1);
  });
});
