import { requireRole } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { revokeInviteAction } from '@/lib/actions/team';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InviteForm } from './invite-form';

export default async function TeamPage() {
  const actor = await requireRole(['OWNER', 'ADMIN']);
  const db = getTenantDb(actor.tenantId);

  const [members, invites] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, email: true, role: true },
    }),
    db.invite.findMany({ where: { acceptedAt: null }, orderBy: { createdAt: 'desc' } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team</h1>
        <p className="mt-1 text-sm text-slate-500">Manage who can access this workspace.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite a member</CardTitle>
        </CardHeader>
        <CardBody>
          <InviteForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardBody className="divide-y divide-slate-100">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-slate-900">{m.name}</p>
                <p className="text-xs text-slate-500">{m.email}</p>
              </div>
              <Badge tone={m.role === 'OWNER' ? 'info' : 'neutral'}>{m.role}</Badge>
            </div>
          ))}
        </CardBody>
      </Card>

      {invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations ({invites.length})</CardTitle>
          </CardHeader>
          <CardBody className="divide-y divide-slate-100">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{inv.email}</p>
                  <p className="truncate font-mono text-xs text-slate-400">/invite/{inv.token}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge>{inv.role}</Badge>
                  <form action={revokeInviteAction}>
                    <input type="hidden" name="inviteId" value={inv.id} />
                    <button className="text-xs font-medium text-red-600 hover:text-red-500">
                      Revoke
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
