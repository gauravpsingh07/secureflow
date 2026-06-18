import { requireActor } from '@/lib/auth/session';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function DashboardPage() {
  const actor = await requireActor();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security overview</h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back, {actor.name}. Your workspace is set up and isolated.
          </p>
        </div>
        <Badge tone="info">{actor.role}</Badge>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Threat detection</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-slate-500">
              Event ingestion and the detection engine come online in the next phases.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Secret scanner</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-slate-500">
              Scan repos and configs for leaked credentials — coming soon.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Posture &amp; audit</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-slate-500">
              Role/permission risk and an append-only audit trail — coming soon.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
