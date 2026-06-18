'use client';

import { useActionState } from 'react';
import { acceptInviteAction, type AcceptState } from '@/lib/actions/team';

const initial: AcceptState = {};

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [state, formAction, pending] = useActionState(acceptInviteAction, initial);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input
          value={email}
          disabled
          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
        />
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
          Your name
        </label>
        <input
          id="name"
          name="name"
          required
          autoComplete="name"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
      >
        {pending ? 'Joining…' : 'Join workspace'}
      </button>
    </form>
  );
}
