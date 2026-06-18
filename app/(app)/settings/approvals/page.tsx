import { requireRole } from '@/lib/auth/session';
import { getTenantDb } from '@/lib/db/tenant';
import { RISKY_ACTIONS, riskyActionLabel } from '@/lib/approvals/catalog';
import { requestApprovalAction, decideApprovalAction } from '@/lib/actions/approvals';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, type BadgeTone } from '@/components/ui/badge';

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: 'warning',
  APPROVED: 'success',
  DENIED: 'neutral',
};

export default async function ApprovalsPage() {
  const actor = await requireRole(['OWNER', 'ADMIN', 'ANALYST']);
  const db = getTenantDb(actor.tenantId);
  const [pending, recent] = await Promise.all([
    db.approvalRequest.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' } }),
    db.approvalRequest.findMany({
      where: { status: { not: 'PENDING' } },
      orderBy: { decidedAt: 'desc' },
      take: 10,
    }),
  ]);
  const isOwner = actor.role === 'OWNER';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Approvals</h1>
        <p className="mt-1 text-sm text-slate-500">
          Risky actions require an owner&apos;s sign-off before they run.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request a risky action</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={requestApprovalAction} className="space-y-3">
            <select
              name="action"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              {RISKY_ACTIONS.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.label} — {a.description}
                </option>
              ))}
            </select>
            <input
              name="note"
              placeholder="Reason (optional)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Submit request
            </button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending ({pending.length})</CardTitle>
        </CardHeader>
        <CardBody className="divide-y divide-slate-100">
          {pending.length === 0 && <p className="text-sm text-slate-500">No pending requests.</p>}
          {pending.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{riskyActionLabel(r.action)}</p>
                <p className="text-xs text-slate-400">
                  by {r.requestedByName}
                  {r.note ? ` · “${r.note}”` : ''}
                </p>
              </div>
              {isOwner ? (
                <div className="flex shrink-0 gap-2">
                  <form action={decideApprovalAction}>
                    <input type="hidden" name="requestId" value={r.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">
                      Approve
                    </button>
                  </form>
                  <form action={decideApprovalAction}>
                    <input type="hidden" name="requestId" value={r.id} />
                    <input type="hidden" name="decision" value="deny" />
                    <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
                      Deny
                    </button>
                  </form>
                </div>
              ) : (
                <Badge tone="warning">Awaiting owner</Badge>
              )}
            </div>
          ))}
        </CardBody>
      </Card>

      {recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent decisions</CardTitle>
          </CardHeader>
          <CardBody className="divide-y divide-slate-100">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{riskyActionLabel(r.action)}</p>
                  <p className="text-xs text-slate-400">
                    {r.decidedByName ? `by ${r.decidedByName}` : ''}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
