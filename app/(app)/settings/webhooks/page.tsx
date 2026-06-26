import { requireRole } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { toggleWebhookAction, deleteWebhookAction } from '@/lib/actions/webhooks';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { AddWebhookForm } from '@/components/webhooks/add-webhook-form';

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: 'warning',
  SUCCESS: 'success',
  FAILED: 'critical',
};

export default async function WebhooksPage() {
  const actor = await requireRole(['OWNER', 'ADMIN']);
  const db = getTenantDb(actor.tenantId);
  const [endpoints, deliveries] = await Promise.all([
    db.webhookEndpoint.findMany({ orderBy: { createdAt: 'desc' } }),
    db.webhookDelivery.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { endpoint: { select: { url: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Webhooks</h1>
        <p className="mt-1 text-sm text-slate-500">
          POST new alerts to your systems. Deliveries are HMAC-signed and retried with backoff.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add an endpoint</CardTitle>
        </CardHeader>
        <CardBody>
          <AddWebhookForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endpoints ({endpoints.length})</CardTitle>
        </CardHeader>
        <CardBody className="divide-y divide-slate-100">
          {endpoints.length === 0 && <p className="text-sm text-slate-500">No endpoints yet.</p>}
          {endpoints.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm text-slate-800">{e.url}</p>
                <p className="text-xs text-slate-400">added {new Date(e.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge tone={e.enabled ? 'success' : 'neutral'}>
                  {e.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
                <form action={toggleWebhookAction}>
                  <input type="hidden" name="endpointId" value={e.id} />
                  <input type="hidden" name="enabled" value={(!e.enabled).toString()} />
                  <button className="text-xs font-medium text-slate-500 hover:text-slate-800">
                    {e.enabled ? 'Disable' : 'Enable'}
                  </button>
                </form>
                <form action={deleteWebhookAction}>
                  <input type="hidden" name="endpointId" value={e.id} />
                  <button className="text-xs font-medium text-red-600 hover:text-red-500">Delete</button>
                </form>
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent deliveries</CardTitle>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Event</th>
                <th className="px-5 py-3 font-medium">Endpoint</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Attempts</th>
                <th className="px-5 py-3 font-medium">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td className="px-5 py-3 font-mono text-xs text-slate-500">{d.eventType}</td>
                  <td className="max-w-[12rem] truncate px-5 py-3 font-mono text-xs text-slate-500">
                    {d.endpoint.url}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_TONE[d.status] ?? 'neutral'}>{d.status}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-500">{d.attempts}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {d.lastStatusCode ? `HTTP ${d.lastStatusCode}` : (d.lastError ?? '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {deliveries.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              No deliveries yet — they appear here as alerts fire.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
