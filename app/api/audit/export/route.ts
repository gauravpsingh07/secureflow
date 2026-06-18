import { getCurrentActor } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { hasAtLeast } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

function csvCell(v: unknown): string {
  const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

type Row = {
  id: string;
  createdAt: Date;
  actorName: string | null;
  action: string;
  target: string | null;
  metadata: unknown;
};

function toCsv(rows: Row[]): string {
  const header = ['id', 'createdAt', 'actorName', 'action', 'target', 'metadata'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [r.id, r.createdAt.toISOString(), r.actorName, r.action, r.target, r.metadata]
        .map(csvCell)
        .join(','),
    );
  }
  return lines.join('\n');
}

/** Download the tenant's audit log as CSV or JSON (admins/owners only). */
export async function GET(req: Request) {
  const actor = await getCurrentActor();
  if (!actor) return new Response('Unauthorized', { status: 401 });
  if (!hasAtLeast(actor.role, 'ADMIN')) return new Response('Forbidden', { status: 403 });

  const format = new URL(req.url).searchParams.get('format') === 'json' ? 'json' : 'csv';
  const rows = await getTenantDb(actor.tenantId).auditLog.findMany({
    orderBy: { createdAt: 'desc' },
  });

  if (format === 'json') {
    return new Response(JSON.stringify(rows, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="audit-log.json"',
      },
    });
  }

  return new Response(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="audit-log.csv"',
    },
  });
}
