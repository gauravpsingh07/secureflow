import Link from 'next/link';
import { requireActor } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { scanAction } from '@/lib/actions/scanner';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function ScannerPage() {
  const actor = await requireActor();
  const scans = await getTenantDb(actor.tenantId).secretScan.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const canScan = actor.role !== 'VIEWER';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Secret scanner</h1>
        <p className="mt-1 text-sm text-slate-500">
          Paste a config, <code className="font-mono text-xs">.env</code>, or code snippet — or
          upload a file — to find leaked credentials. Secrets are masked and never stored raw.
        </p>
      </div>

      {canScan && (
        <Card>
          <CardHeader>
            <CardTitle>New scan</CardTitle>
          </CardHeader>
          <CardBody>
            <form action={scanAction} className="space-y-3">
              <textarea
                name="text"
                rows={8}
                placeholder="Paste code, config, or .env contents…"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
              <div className="flex items-center justify-between gap-3">
                <input type="file" name="file" className="text-sm text-slate-500" />
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  Scan
                </button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent scans</CardTitle>
        </CardHeader>
        <CardBody className="divide-y divide-slate-100">
          {scans.length === 0 && <p className="text-sm text-slate-500">No scans yet.</p>}
          {scans.map((s) => (
            <Link
              key={s.id}
              href={`/scanner/${s.id}`}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{s.source}</p>
                <p className="text-xs text-slate-400">
                  {new Date(s.createdAt).toLocaleString()} · {s.bytesScanned} bytes
                </p>
              </div>
              <Badge tone={s.findingCount > 0 ? 'critical' : 'success'}>
                {s.findingCount} finding{s.findingCount === 1 ? '' : 's'}
              </Badge>
            </Link>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
