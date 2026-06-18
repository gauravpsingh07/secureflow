import type { Prisma } from '@/lib/generated/prisma/client';
import type { SecurityEventType } from '@/lib/generated/prisma/enums';
import { eventTypeEnum } from '@/lib/validation/event';

export type EventFilters = {
  type?: SecurityEventType;
  actor?: string;
  ip?: string;
  success?: 'true' | 'false';
};

export type SearchParams = Record<string, string | string[] | undefined>;

const TYPES = eventTypeEnum.options;

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

/** Parse raw search params into a validated, typed filter object. */
export function parseEventFilters(sp: SearchParams): EventFilters {
  const type = first(sp.type);
  const success = first(sp.success);
  return {
    type: type && (TYPES as readonly string[]).includes(type) ? (type as SecurityEventType) : undefined,
    actor: first(sp.actor),
    ip: first(sp.ip),
    success: success === 'true' || success === 'false' ? success : undefined,
  };
}

/** Translate filters into a Prisma `where` clause for SecurityEvent. */
export function buildEventWhere(f: EventFilters): Prisma.SecurityEventWhereInput {
  const where: Prisma.SecurityEventWhereInput = {};
  if (f.type) where.type = f.type;
  if (f.actor) where.actorEmail = { contains: f.actor, mode: 'insensitive' };
  if (f.ip) where.ip = { contains: f.ip };
  if (f.success) where.success = f.success === 'true';
  return where;
}
