'use client';

import { useActionState } from 'react';
import { createApiKeyAction, type CreateKeyState } from '@/lib/actions/apikeys';

const initial: CreateKeyState = {};

export function CreateKeyForm() {
  const [state, formAction, pending] = useActionState(createApiKeyAction, initial);

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="grow">
          <label htmlFor="key-name" className="block text-xs font-medium text-slate-600">
            Key name
          </label>
          <input
            id="key-name"
            name="name"
            required
            placeholder="Production ingestion"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {pending ? 'Creating…' : 'Create key'}
        </button>
      </form>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      {state.rawKey && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Copy your key now — it won&apos;t be shown again.
          </p>
          <code className="mt-2 block overflow-x-auto rounded-md bg-white px-3 py-2 font-mono text-sm text-slate-800 select-all">
            {state.rawKey}
          </code>
        </div>
      )}
    </div>
  );
}
