import Link from 'next/link';
import { requireActor } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { parseAlertFilters, buildAlertWhere, type SearchParams } from '@/lib/alerts/query';
import { severityTone, statusTone, statusLabel } from '@/lib/alerts/display';
import { setAlertStatusAction } from '@/lib/actions/alerts';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function fmt(d: Date): string {
  return new Date(d).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusButton({ alertId, to, label }: { alertId: string; to: string; label: string }) {
  return (
    <form action={setAlertStatusAction} className="inline">
      <input type="hidden" name="alertId" value={alertId} />
      <input type="hidden" name="status" value={to} />
      <button className="text-xs font-medium text-slate-500 hover:text-slate-800">{label}</button>
    </form>
  );
}

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const actor = await requireActor();
  const filters = parseAlertFilters(await searchParams);
  const where = buildAlertWhere(filters);

  const alerts = await getTenantDb(actor.tenantId).alert.findMany({
    where,
    orderBy: [{ status: 'asc' }, { severity: 'desc' }, { lastSeen: 'desc' }],
    take: 100,
  });

  const canTriage = actor.role !== 'VIEWER';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Alerts</h1>
        <p className="mt-1 text-sm text-slate-500">
          Findings from the detection engine, correlated into one row per incident.
        </p>
      </div>

      <Card>
        <CardBody>
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Status</label>
              <select
                name="status"
                defaultValue={filters.status ?? ''}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Severity</label>
              <select
                name="severity"
                defaultValue={filters.severity ?? ''}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Apply
            </button>
            <a href="/alerts" className="px-2 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">
              Clear
            </a>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-5 py-3 font-medium">Alert</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Last seen</th>
                {canTriage && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {alerts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <Badge tone={severityTone(a.severity)}>{a.severity}</Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/alerts/${a.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                      {a.title}
                    </Link>
                    <p className="text-xs text-slate-400">{a.detectorKey}</p>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={statusTone(a.status)}>{statusLabel(a.status)}</Badge>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-slate-500">{fmt(a.lastSeen)}</td>
                  {canTriage && (
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-3">
                        {a.status === 'OPEN' && (
                          <StatusButton alertId={a.id} to="ACKNOWLEDGED" label="Acknowledge" />
                        )}
                        {a.status !== 'RESOLVED' && (
                          <StatusButton alertId={a.id} to="RESOLVED" label="Resolve" />
                        )}
                        {a.status === 'RESOLVED' && (
                          <StatusButton alertId={a.id} to="OPEN" label="Reopen" />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {alerts.length === 0 && (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              No alerts. Ingest events and run the detection worker to populate this list.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
