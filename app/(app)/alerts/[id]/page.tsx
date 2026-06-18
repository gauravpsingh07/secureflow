import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireActor } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { severityTone, statusTone, statusLabel } from '@/lib/alerts/display';
import { remediationFor } from '@/lib/detection/remediation';
import { setAlertStatusAction } from '@/lib/actions/alerts';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function fmt(d: Date): string {
  return new Date(d).toLocaleString();
}

function StatusButton({ alertId, to, label }: { alertId: string; to: string; label: string }) {
  return (
    <form action={setAlertStatusAction}>
      <input type="hidden" name="alertId" value={alertId} />
      <input type="hidden" name="status" value={to} />
      <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
        {label}
      </button>
    </form>
  );
}

export default async function AlertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;

  const alert = await getTenantDb(actor.tenantId).alert.findFirst({
    where: { id },
    include: { events: { include: { event: true } } },
  });
  if (!alert) notFound();

  const events = alert.events
    .map((ae) => ae.event)
    .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const canTriage = actor.role !== 'VIEWER';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/alerts" className="text-sm font-medium text-slate-500 hover:text-slate-700">
        ← Back to alerts
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone={severityTone(alert.severity)}>{alert.severity}</Badge>
            <Badge tone={statusTone(alert.status)}>{statusLabel(alert.status)}</Badge>
            <span className="text-xs text-slate-400">score {Math.round(alert.score)}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{alert.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {alert.detectorKey} · first seen {fmt(alert.firstSeen)} · last seen {fmt(alert.lastSeen)}
          </p>
        </div>
        {canTriage && (
          <div className="flex gap-2">
            {alert.status === 'OPEN' && (
              <StatusButton alertId={alert.id} to="ACKNOWLEDGED" label="Acknowledge" />
            )}
            {alert.status !== 'RESOLVED' && (
              <StatusButton alertId={alert.id} to="RESOLVED" label="Resolve" />
            )}
            {alert.status === 'RESOLVED' && (
              <StatusButton alertId={alert.id} to="OPEN" label="Reopen" />
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Why this fired</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-slate-700">{alert.explanation}</p>
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3">
            <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">
              Recommended action
            </p>
            <p className="mt-1 text-sm text-slate-700">{remediationFor(alert.detectorKey)}</p>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-600">
            {JSON.stringify(alert.evidence, null, 2)}
          </pre>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contributing events ({events.length})</CardTitle>
        </CardHeader>
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
                <tr key={e.id}>
                  <td className="px-5 py-3 whitespace-nowrap text-slate-500">{fmt(e.occurredAt)}</td>
                  <td className="px-5 py-3">
                    <Badge>{e.type}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-700">{e.actorEmail ?? '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{e.ip ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-500">
                    {[e.city, e.country].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={e.success ? 'success' : 'critical'}>
                      {e.success ? 'OK' : 'Fail'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
