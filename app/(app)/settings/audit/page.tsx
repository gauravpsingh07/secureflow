import Link from 'next/link';
import { requireRole } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Prisma } from '@/lib/generated/prisma/client';

type SearchParams = Record<string, string | string[] | undefined>;
const PAGE_SIZE = 50;

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s?.trim() || undefined;
}

function summarize(metadata: unknown): string {
  if (!metadata || typeof metadata !== 'object') return '';
  const entries = Object.entries(metadata as Record<string, unknown>);
  if (entries.length === 0) return '';
  return entries.map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(' ');
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const actor = await requireRole(['OWNER', 'ADMIN']);
  const sp = await searchParams;
  const action = one(sp.action);
  const who = one(sp.actor);
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const where: Prisma.AuditLogWhereInput = {};
  if (action) where.action = { contains: action, mode: 'insensitive' };
  if (who) where.actorName = { contains: who, mode: 'insensitive' };

  const db = getTenantDb(actor.tenantId);
  const [total, entries] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (action) params.set('action', action);
    if (who) params.set('actor', who);
    params.set('page', String(p));
    return `/settings/audit?${params.toString()}`;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Audit log</h1>
          <p className="mt-1 text-sm text-slate-500">
            Append-only record of every sensitive action ({total} entries).
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <a
            href="/api/audit/export?format=csv"
            className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
          >
            Export CSV
          </a>
          <a
            href="/api/audit/export?format=json"
            className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
          >
            Export JSON
          </a>
        </div>
      </div>

      <Card>
        <CardBody>
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Action</label>
              <input
                name="action"
                defaultValue={action ?? ''}
                placeholder="e.g. apikey"
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Actor</label>
              <input
                name="actor"
                defaultValue={who ?? ''}
                placeholder="name contains…"
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Apply
            </button>
            <Link
              href="/settings/audit"
              className="px-2 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              Clear
            </Link>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium">Actor</th>
                <th className="px-5 py-3 font-medium">Action</th>
                <th className="px-5 py-3 font-medium">Target</th>
                <th className="px-5 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-5 py-3 whitespace-nowrap text-slate-500">
                    {new Date(e.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-slate-700">{e.actorName ?? '—'}</td>
                  <td className="px-5 py-3">
                    <Badge>{e.action}</Badge>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{e.target ?? '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-400">
                    {summarize(e.metadata)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No audit entries match.</p>
          )}
        </CardBody>
      </Card>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={qs(page - 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-100"
            >
              ← Prev
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={qs(page + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium hover:bg-slate-100"
            >
              Next →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
