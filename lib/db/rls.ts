import { prisma } from './client';

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Runs `fn` inside a transaction with the Postgres `app.current_tenant` session
 * variable set, so Row-Level Security policies (see the `*_rls` migration)
 * enforce tenant isolation at the database layer. This is the second isolation
 * layer behind lib/db/tenant.ts.
 *
 * set_config(..., true) scopes the setting to the current transaction only, so
 * it can't leak across pooled connections.
 */
export async function withTenantRls<T>(
  tenantId: string,
  fn: (tx: TxClient) => Promise<T>,
): Promise<T> {
  if (!tenantId) throw new Error('withTenantRls: tenantId is required');
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant', ${tenantId}, true)`;
    return fn(tx);
  });
}
