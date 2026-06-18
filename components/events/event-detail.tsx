import Link from 'next/link';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export type EventDetailData = {
  id: string;
  type: string;
  actorEmail: string | null;
  ip: string | null;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  userAgent: string | null;
  success: boolean;
  occurredAt: Date;
  createdAt: Date;
  raw: unknown;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium break-all text-slate-800">{value || '—'}</dd>
    </div>
  );
}

export function EventDetail({ event, closeHref }: { event: EventDetailData; closeHref: string }) {
  const geo =
    event.latitude != null && event.longitude != null
      ? `${event.latitude.toFixed(2)}, ${event.longitude.toFixed(2)}`
      : '';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Event detail</CardTitle>
          <Link href={closeHref} className="text-xs font-medium text-slate-400 hover:text-slate-600">
            Close ✕
          </Link>
        </div>
      </CardHeader>
      <CardBody>
        <div className="mb-3 flex items-center gap-2">
          <Badge>{event.type}</Badge>
          <Badge tone={event.success ? 'success' : 'critical'}>
            {event.success ? 'Success' : 'Failure'}
          </Badge>
        </div>
        <dl className="divide-y divide-slate-50 text-sm">
          <Row label="Actor" value={event.actorEmail} />
          <Row label="IP" value={event.ip} />
          <Row label="City / Country" value={[event.city, event.country].filter(Boolean).join(', ')} />
          <Row label="Coordinates" value={geo} />
          <Row label="User agent" value={event.userAgent} />
          <Row label="Occurred at" value={new Date(event.occurredAt).toLocaleString()} />
          <Row label="Ingested at" value={new Date(event.createdAt).toLocaleString()} />
        </dl>
        {event.raw != null && (
          <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-600">
            {JSON.stringify(event.raw, null, 2)}
          </pre>
        )}
      </CardBody>
    </Card>
  );
}
