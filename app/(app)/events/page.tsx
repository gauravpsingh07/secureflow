import { requireActor } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { parseEventFilters, buildEventWhere, type SearchParams } from '@/lib/events/query';
import { eventTypeEnum } from '@/lib/validation/event';
import { Card, CardBody } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const TYPE_OPTIONS = eventTypeEnum.options;

function fmt(d: Date): string {
  return new Date(d).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function location(country: string | null, city: string | null): string {
  return [city, country].filter(Boolean).join(', ') || '—';
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const actor = await requireActor();
  const sp = await searchParams;
  const filters = parseEventFilters(sp);
  const where = buildEventWhere(filters);

  const events = await getTenantDb(actor.tenantId).securityEvent.findMany({
    where,
    orderBy: { occurredAt: 'desc' },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security events</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ingested login and security telemetry for your workspace.
        </p>
      </div>

      <Card>
        <CardBody>
          <form method="GET" className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">Type</label>
              <select
                name="type"
                defaultValue={filters.type ?? ''}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All types</option>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Actor</label>
              <input
                name="actor"
                defaultValue={filters.actor ?? ''}
                placeholder="email contains…"
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">IP</label>
              <input
                name="ip"
                defaultValue={filters.ip ?? ''}
                placeholder="1.2.3.4"
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Result</label>
              <select
                name="success"
                defaultValue={filters.success ?? ''}
                className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Any</option>
                <option value="true">Success</option>
                <option value="false">Failure</option>
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Apply
            </button>
            <a href="/events" className="px-2 py-2 text-sm font-medium text-slate-500 hover:text-slate-700">
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
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Actor</th>
                <th className="px-5 py-3 font-medium">IP</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 whitespace-nowrap text-slate-500">{fmt(e.occurredAt)}</td>
                  <td className="px-5 py-3">
                    <Badge>{e.type}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-700">{e.actorEmail ?? '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{e.ip ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-500">{location(e.country, e.city)}</td>
                  <td className="px-5 py-3">
                    <Badge tone={e.success ? 'success' : 'critical'}>
                      {e.success ? 'OK' : 'Fail'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              No events match these filters.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
