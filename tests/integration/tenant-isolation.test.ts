import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db/client';
import { getTenantDb } from '@/lib/db/tenant';

// Hits a real Postgres (DATABASE_URL). Run with `pnpm test:int`.
// Proves both isolation layers: the application query-scope (lib/db/tenant.ts)
// and the Postgres RLS policies (the *_rls migrations).

const SUFFIX = `it-${Date.now()}`;
const RLS_ROLE = 'sf_rls_test';
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

  // A non-superuser role. Superusers (e.g. the default `postgres` user) bypass
  // RLS even with FORCE, so RLS is verified by scoping queries to this role.
  await prisma.$executeRawUnsafe(
    `DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${RLS_ROLE}') THEN CREATE ROLE ${RLS_ROLE} NOLOGIN NOSUPERUSER; END IF; END $$;`,
  );
  await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${RLS_ROLE}`);
  await prisma.$executeRawUnsafe(`GRANT SELECT ON "User" TO ${RLS_ROLE}`);
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

// Run a query as the restricted role with the tenant GUC set, so RLS applies.
async function rowsUnderRls(predicate: 'other-tenant' | 'own-tenant'): Promise<number> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL ROLE ${RLS_ROLE}`);
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantA}, true)`;
    const rows =
      predicate === 'other-tenant'
        ? await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE id = ${userBId}`
        : await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE "tenantId" = ${tenantA}`;
    return rows.length;
  });
}

describe('tenant isolation — RLS layer', () => {
  it('hides another tenant row from a non-owner role', async () => {
    expect(await rowsUnderRls('other-tenant')).toBe(0);
  });

  it('still shows the active tenant rows', async () => {
    expect(await rowsUnderRls('own-tenant')).toBe(1);
  });
});
