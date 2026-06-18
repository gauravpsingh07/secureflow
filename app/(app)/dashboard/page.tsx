import Link from 'next/link';
import { requireActor } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { severityTone } from '@/lib/alerts/display';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, type Bar } from '@/components/charts/bar-chart';
import type { AlertSeverity } from '@/lib/generated/prisma/enums';

const DAY = 86_400_000;
const OPEN = { status: { not: 'RESOLVED' as const } };

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
        <p className={`mt-1 text-3xl font-bold ${tone ?? 'text-slate-900'}`}>{value}</p>
      </CardBody>
    </Card>
  );
}

export default async function DashboardPage() {
  const actor = await requireActor();
  const db = getTenantDb(actor.tenantId);
  const now = new Date();
  const dayAgo = new Date(now.getTime() - DAY);
  const weekAgo = new Date(now.getTime() - 7 * DAY);

  const severities: AlertSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const [openTotal, critical, high, events24h, failed24h, activeKeys, recentEvents, recentAlerts] =
    await Promise.all([
      db.alert.count({ where: OPEN }),
      db.alert.count({ where: { ...OPEN, severity: 'CRITICAL' } }),
      db.alert.count({ where: { ...OPEN, severity: 'HIGH' } }),
      db.securityEvent.count({ where: { occurredAt: { gte: dayAgo } } }),
      db.securityEvent.count({ where: { type: 'LOGIN_FAILURE', occurredAt: { gte: dayAgo } } }),
      db.apiKey.count({ where: { revokedAt: null } }),
      db.securityEvent.findMany({
        where: { occurredAt: { gte: weekAgo } },
        select: { occurredAt: true },
      }),
      db.alert.findMany({
        where: OPEN,
        orderBy: [{ severity: 'desc' }, { lastSeen: 'desc' }],
        take: 5,
      }),
    ]);

  const openBySeverity = await Promise.all(
    severities.map((s) => db.alert.count({ where: { ...OPEN, severity: s } })),
  );

  // events per day for the last 7 days
  const buckets: Bar[] = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date(now.getTime() - i * DAY);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + DAY);
    const value = recentEvents.filter(
      (e) => e.occurredAt >= start && e.occurredAt < end,
    ).length;
    buckets.push({ label: start.toLocaleDateString(undefined, { weekday: 'short' }), value });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security overview</h1>
        <p className="mt-1 text-sm text-slate-500">Posture for your workspace at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Open alerts" value={openTotal} />
        <Stat label="Critical (open)" value={critical} tone="text-red-600" />
        <Stat label="Events (24h)" value={events24h} />
        <Stat label="Failed logins (24h)" value={failed24h} tone="text-amber-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Events — last 7 days</CardTitle>
          </CardHeader>
          <CardBody>
            <BarChart data={buckets} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open alerts by severity</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2">
            {severities.map((s, i) => (
              <div key={s} className="flex items-center justify-between">
                <Badge tone={severityTone(s)}>{s}</Badge>
                <span className="text-sm font-medium text-slate-700">{openBySeverity[i]}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-sm text-slate-500">
              <span>Active API keys</span>
              <span className="font-medium text-slate-700">{activeKeys}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top open alerts</CardTitle>
        </CardHeader>
        <CardBody className="divide-y divide-slate-100">
          {recentAlerts.length === 0 && (
            <p className="text-sm text-slate-500">
              No open alerts. Ingest events and run detection to populate this.
            </p>
          )}
          {recentAlerts.map((a) => (
            <Link
              key={a.id}
              href={`/alerts/${a.id}`}
              className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0 hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <Badge tone={severityTone(a.severity)}>{a.severity}</Badge>
                <span className="text-sm font-medium text-slate-800">{a.title}</span>
              </div>
              <span className="text-xs text-slate-400">{a.detectorKey}</span>
            </Link>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
