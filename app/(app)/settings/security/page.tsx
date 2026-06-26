import { requireActor } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { disableMfaAction } from '@/lib/actions/security';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MfaSetup } from '@/components/security/mfa-setup';

export default async function SecurityPage() {
  const actor = await requireActor();
  const user = await prisma.user.findUnique({
    where: { id: actor.userId },
    select: { mfaEnabled: true },
  });
  const enabled = !!user?.mfaEnabled;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Security</h1>
        <p className="mt-1 text-sm text-slate-500">Protect your account with a second factor.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Two-factor authentication (TOTP)</CardTitle>
            <Badge tone={enabled ? 'success' : 'neutral'}>{enabled ? 'Enabled' : 'Disabled'}</Badge>
          </div>
        </CardHeader>
        <CardBody>
          {enabled ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                2FA is on. You&apos;ll enter a code from your authenticator app at sign-in.
              </p>
              <form action={disableMfaAction}>
                <button className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50">
                  Disable 2FA
                </button>
              </form>
            </div>
          ) : (
            <MfaSetup />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
