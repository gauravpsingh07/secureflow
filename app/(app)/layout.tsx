import type { ReactNode } from 'react';
import Link from 'next/link';
import { requireActor } from '@/lib/auth/session';
import { signOutAction } from '@/lib/actions/auth';
import { prisma } from '@/lib/db/client';
import { getTenantDb } from '@/lib/db/tenant';
import { isDemoMode } from '@/lib/demo';
import type { Role } from '@/lib/auth/rbac';

const NAV: { href: string; label: string; roles: Role[] }[] = [
  { href: '/dashboard', label: 'Dashboard', roles: ['OWNER', 'ADMIN', 'ANALYST', 'VIEWER'] },
  { href: '/alerts', label: 'Alerts', roles: ['OWNER', 'ADMIN', 'ANALYST', 'VIEWER'] },
  { href: '/events', label: 'Events', roles: ['OWNER', 'ADMIN', 'ANALYST', 'VIEWER'] },
  { href: '/scanner', label: 'Secret scanner', roles: ['OWNER', 'ADMIN', 'ANALYST', 'VIEWER'] },
  { href: '/risk', label: 'Access review', roles: ['OWNER', 'ADMIN'] },
  { href: '/settings/detection', label: 'Detection rules', roles: ['OWNER', 'ADMIN'] },
  { href: '/settings/approvals', label: 'Approvals', roles: ['OWNER', 'ADMIN', 'ANALYST'] },
  { href: '/settings/audit', label: 'Audit log', roles: ['OWNER', 'ADMIN'] },
  { href: '/settings/team', label: 'Team', roles: ['OWNER', 'ADMIN'] },
  { href: '/settings/api-keys', label: 'API keys', roles: ['OWNER', 'ADMIN'] },
];

export default async function AppLayout({ children }: { children: ReactNode }) {
  const actor = await requireActor();
  const tenant = await prisma.tenant.findUnique({
    where: { id: actor.tenantId },
    select: { name: true },
  });
  const unread = await getTenantDb(actor.tenantId).notification.count({ where: { readAt: null } });
  const links = NAV.filter((n) => n.roles.includes(actor.role));

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {isDemoMode() && (
        <div
          role="status"
          className="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900"
        >
          Read-only demo — sign-in works, but changes are disabled.
        </div>
      )}
      <div className="flex flex-1">
      <aside className="flex w-60 flex-col border-r border-slate-200 bg-white p-4">
        <div className="px-2 py-3">
          <p className="text-xs font-medium tracking-wide text-indigo-500 uppercase">SecureFlow</p>
          <p className="truncate text-sm font-semibold">{tenant?.name ?? 'Workspace'}</p>
        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/notifications"
            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <span>Notifications</span>
            {unread > 0 && (
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
                {unread}
              </span>
            )}
          </Link>
        </nav>

        <div className="mt-auto border-t border-slate-200 pt-3">
          <p className="truncate px-2 text-sm font-medium">{actor.name}</p>
          <p className="px-2 text-xs text-slate-400 capitalize">{actor.role.toLowerCase()}</p>
          <form action={signOutAction} className="mt-2">
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
              Sign out
            </button>
          </form>
        </div>
      </aside>

        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
