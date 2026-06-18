import { prisma } from './db/client';
import type { Prisma } from './generated/prisma/client';

export type AuditParams = {
  tenantId: string;
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  target?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Append an immutable audit-log entry. Writes only — updates/deletes are blocked
 * at the database. Called from every sensitive mutation.
 */
export async function audit(params: AuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      actorId: params.actorId ?? null,
      actorName: params.actorName ?? null,
      action: params.action,
      target: params.target ?? null,
      metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}
