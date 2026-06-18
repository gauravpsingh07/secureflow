import Link from 'next/link';
import { requireActor } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { markAllNotificationsReadAction } from '@/lib/actions/notifications';
import { Card, CardBody } from '@/components/ui/card';

function fmt(d: Date): string {
  return new Date(d).toLocaleString();
}

export default async function NotificationsPage() {
  const actor = await requireActor();
  const notes = await getTenantDb(actor.tenantId).notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const unread = notes.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">{unread} unread</p>
        </div>
        {unread > 0 && (
          <form action={markAllNotificationsReadAction}>
            <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Mark all read
            </button>
          </form>
        )}
      </div>

      <Card>
        <CardBody className="divide-y divide-slate-100">
          {notes.length === 0 && (
            <p className="text-sm text-slate-500">No notifications yet.</p>
          )}
          {notes.map((n) => {
            const inner = (
              <div className={`flex items-start gap-3 py-3 ${n.readAt ? '' : 'font-medium'}`}>
                {!n.readAt && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
                <div className={n.readAt ? 'ml-5' : ''}>
                  <p className="text-sm text-slate-900">{n.title}</p>
                  <p className="text-xs text-slate-500">{n.body}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{fmt(n.createdAt)}</p>
                </div>
              </div>
            );
            return n.alertId ? (
              <Link key={n.id} href={`/alerts/${n.alertId}`} className="block hover:bg-slate-50">
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}
