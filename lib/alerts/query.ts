import type { Prisma } from '@/lib/generated/prisma/client';
import type { AlertSeverity, AlertStatus } from '@/lib/generated/prisma/enums';

export type AlertFilters = {
  status?: AlertStatus;
  severity?: AlertSeverity;
};

export type SearchParams = Record<string, string | string[] | undefined>;

const STATUSES: AlertStatus[] = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];
const SEVERITIES: AlertSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function first(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

export function parseAlertFilters(sp: SearchParams): AlertFilters {
  const status = first(sp.status);
  const severity = first(sp.severity);
  return {
    status: status && (STATUSES as string[]).includes(status) ? (status as AlertStatus) : undefined,
    severity:
      severity && (SEVERITIES as string[]).includes(severity) ? (severity as AlertSeverity) : undefined,
  };
}

export function buildAlertWhere(f: AlertFilters): Prisma.AlertWhereInput {
  const where: Prisma.AlertWhereInput = {};
  if (f.status) where.status = f.status;
  if (f.severity) where.severity = f.severity;
  return where;
}

export function alertsHref(filters: AlertFilters, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.severity) params.set('severity', filters.severity);
  for (const [k, v] of Object.entries(extra)) params.set(k, v);
  const qs = params.toString();
  return qs ? `/alerts?${qs}` : '/alerts';
}
