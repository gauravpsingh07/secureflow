import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireActor } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { severityTone } from '@/lib/alerts/display';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function ScanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActor();
  const { id } = await params;

  const scan = await getTenantDb(actor.tenantId).secretScan.findFirst({
    where: { id },
    include: { findings: true },
  });
  if (!scan) notFound();

  const findings = [...scan.findings].sort((a, b) => a.line - b.line || a.column - b.column);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/scanner" className="text-sm font-medium text-slate-500 hover:text-slate-700">
        ← Back to scanner
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{scan.source}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {new Date(scan.createdAt).toLocaleString()} · {scan.bytesScanned} bytes scanned
          </p>
        </div>
        <Badge tone={scan.findingCount > 0 ? 'critical' : 'success'}>
          {scan.findingCount} finding{scan.findingCount === 1 ? '' : 's'}
        </Badge>
      </div>

      {findings.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-emerald-700">No secrets found. ✓</p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Findings</CardTitle>
          </CardHeader>
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs text-slate-500 uppercase">
                <tr>
                  <th className="px-5 py-3 font-medium">Severity</th>
                  <th className="px-5 py-3 font-medium">Rule</th>
                  <th className="px-5 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium">Match</th>
                  <th className="px-5 py-3 font-medium">Remediation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {findings.map((f) => (
                  <tr key={f.id} className="align-top">
                    <td className="px-5 py-3">
                      <Badge tone={severityTone(f.severity)}>{f.severity}</Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{f.ruleName}</td>
                    <td className="px-5 py-3 font-mono text-xs whitespace-nowrap text-slate-500">
                      line {f.line}:{f.column}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600">{f.maskedValue}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{f.remediation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
