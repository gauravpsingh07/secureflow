import { requireRole } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { revokeApiKeyAction } from '@/lib/actions/apikeys';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreateKeyForm } from './create-key-form';

function formatDate(d: Date | null): string {
  return d ? new Date(d).toLocaleDateString() : '—';
}

export default async function ApiKeysPage() {
  const actor = await requireRole(['OWNER', 'ADMIN']);
  const keys = await getTenantDb(actor.tenantId).apiKey.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">API keys</h1>
        <p className="mt-1 text-sm text-slate-500">
          Authenticate event ingestion to{' '}
          <code className="font-mono text-xs">POST /api/v1/events</code> with the{' '}
          <code className="font-mono text-xs">X-API-Key</code> header.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a key</CardTitle>
        </CardHeader>
        <CardBody>
          <CreateKeyForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keys ({keys.length})</CardTitle>
        </CardHeader>
        <CardBody className="divide-y divide-slate-100">
          {keys.length === 0 && <p className="text-sm text-slate-500">No keys yet.</p>}
          {keys.map((k) => {
            const revoked = !!k.revokedAt;
            return (
              <div
                key={k.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{k.name}</p>
                  <p className="font-mono text-xs text-slate-400">
                    {k.prefix}… · created {formatDate(k.createdAt)} · last used{' '}
                    {formatDate(k.lastUsedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone={revoked ? 'neutral' : 'success'}>
                    {revoked ? 'Revoked' : 'Active'}
                  </Badge>
                  {!revoked && (
                    <form action={revokeApiKeyAction}>
                      <input type="hidden" name="keyId" value={k.id} />
                      <button className="text-xs font-medium text-red-600 hover:text-red-500">
                        Revoke
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}
