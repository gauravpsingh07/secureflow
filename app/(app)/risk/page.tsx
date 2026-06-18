import { requireRole } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';

const DAY = 86_400_000;

type Finding = { tone: BadgeTone; label: string; text: string };

export default async function RiskPage() {
  const actor = await requireRole(['OWNER', 'ADMIN']);
  const db = getTenantDb(actor.tenantId);
  const now = new Date();
  const staleCutoff = new Date(now.getTime() - 30 * DAY);

  const [members, logins, pendingInvites] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    db.securityEvent.findMany({
      where: { type: 'LOGIN_SUCCESS', occurredAt: { gte: new Date(now.getTime() - 90 * DAY) } },
      select: { actorEmail: true, occurredAt: true },
      orderBy: { occurredAt: 'desc' },
    }),
    db.invite.count({ where: { acceptedAt: null } }),
  ]);

  const lastActive = new Map<string, Date>();
  for (const l of logins) {
    if (l.actorEmail && !lastActive.has(l.actorEmail)) lastActive.set(l.actorEmail, l.occurredAt);
  }

  const privileged = members.filter((m) => m.role === 'OWNER' || m.role === 'ADMIN');
  const owners = members.filter((m) => m.role === 'OWNER');
  const stale = members.filter((m) => {
    const seen = lastActive.get(m.email);
    return (!seen || seen < staleCutoff) && m.createdAt < staleCutoff;
  });

  const findings: Finding[] = [];
  if (members.length > 0 && privileged.length / members.length > 0.5) {
    findings.push({
      tone: 'warning',
      label: 'Over-privileged',
      text: `${privileged.length} of ${members.length} members have admin or owner access. Apply least privilege.`,
    });
  }
  if (stale.length > 0) {
    findings.push({
      tone: 'warning',
      label: 'Stale accounts',
      text: `${stale.length} member(s) have no successful login in 30 days — review and deactivate if unused.`,
    });
  }
  if (owners.length === 1) {
    findings.push({
      tone: 'info',
      label: 'Single owner',
      text: 'Only one owner — consider a second to avoid a bus-factor / lockout risk.',
    });
  }
  if (owners.length > 3) {
    findings.push({ tone: 'warning', label: 'Many owners', text: `${owners.length} owners is unusually high.` });
  }
  if (pendingInvites > 0) {
    findings.push({
      tone: 'info',
      label: 'Outstanding invites',
      text: `${pendingInvites} invitation(s) still pending — revoke any that are no longer needed.`,
    });
  }
  if (findings.length === 0) {
    findings.push({ tone: 'success', label: 'Healthy', text: 'No access-review risks detected.' });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Access review</h1>
        <p className="mt-1 text-sm text-slate-500">
          Role and permission risk across your workspace.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          {findings.map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <Badge tone={f.tone}>{f.label}</Badge>
              <p className="text-sm text-slate-700">{f.text}</p>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 text-xs text-slate-500 uppercase">
              <tr>
                <th className="px-5 py-3 font-medium">Member</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Last login</th>
                <th className="px-5 py-3 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {members.map((m) => {
                const seen = lastActive.get(m.email);
                const isStale = stale.some((s) => s.id === m.id);
                const isPriv = m.role === 'OWNER' || m.role === 'ADMIN';
                return (
                  <tr key={m.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{m.name}</p>
                      <p className="text-xs text-slate-400">{m.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={isPriv ? 'info' : 'neutral'}>{m.role}</Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {seen ? new Date(seen).toLocaleDateString() : 'never'}
                    </td>
                    <td className="px-5 py-3">
                      {isStale ? (
                        <Badge tone="warning">Stale</Badge>
                      ) : isPriv ? (
                        <Badge tone="neutral">Privileged</Badge>
                      ) : (
                        <Badge tone="success">OK</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
