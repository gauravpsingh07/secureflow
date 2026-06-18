import Link from 'next/link';
import { prisma } from '@/lib/db/client';
import { AcceptInviteForm } from './accept-form';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: { tenant: { select: { name: true } } },
  });
  const valid = invite && !invite.acceptedAt;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        {valid ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Join {invite.tenant.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              You&apos;ve been invited as <span className="font-medium">{invite.role}</span>. Set a
              password to continue.
            </p>
            <AcceptInviteForm token={token} email={invite.email} />
          </>
        ) : (
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invitation invalid</h1>
            <p className="mt-2 text-sm text-slate-500">
              This invitation link is invalid or has already been used.
            </p>
            <Link
              href="/sign-in"
              className="mt-6 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Go to sign in
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
