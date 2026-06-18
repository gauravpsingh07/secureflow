'use client';

import { useActionState } from 'react';
import { inviteMemberAction, type TeamActionState } from '@/lib/actions/team';

const initial: TeamActionState = {};

export function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteMemberAction, initial);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="grow">
        <label htmlFor="invite-email" className="block text-xs font-medium text-slate-600">
          Email
        </label>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          placeholder="teammate@company.com"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="invite-role" className="block text-xs font-medium text-slate-600">
          Role
        </label>
        <select
          id="invite-role"
          name="role"
          defaultValue="ANALYST"
          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="ADMIN">Admin</option>
          <option value="ANALYST">Analyst</option>
          <option value="VIEWER">Viewer</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
      >
        {pending ? 'Inviting…' : 'Send invite'}
      </button>

      {state.error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {state.error}
        </p>
      )}
      {state.ok && <p className="w-full text-sm text-emerald-600">{state.ok}</p>}
    </form>
  );
}
