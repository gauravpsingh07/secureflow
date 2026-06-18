import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db/client';
import { audit } from '@/lib/audit';

// Hits a real Postgres (DATABASE_URL). Run with `pnpm test:int`.
// Verifies the audit log is append-only: writes succeed, updates are rejected by
// the database trigger from the 0010_audit_immutable migration.

const SUFFIX = `aud-${Date.now()}`;
let tenantId = '';

beforeAll(async () => {
  const t = await prisma.tenant.create({ data: { name: `Aud ${SUFFIX}`, slug: `aud-${SUFFIX}` } });
  tenantId = t.id;
});

afterAll(async () => {
  await prisma.tenant.deleteMany({ where: { slug: `aud-${SUFFIX}` } });
  await prisma.$disconnect();
});

describe('audit log integrity', () => {
  it('appends entries', async () => {
    await audit({ tenantId, actorName: 'tester', action: 'test.append', target: 'x' });
    const rows = await prisma.auditLog.findMany({ where: { tenantId } });
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects updates (append-only)', async () => {
    const row = await prisma.auditLog.findFirstOrThrow({ where: { tenantId } });
    await expect(
      prisma.auditLog.update({ where: { id: row.id }, data: { action: 'tampered' } }),
    ).rejects.toThrow();
  });
});
