'use client';

import { useActionState } from 'react';
import { addWebhookAction, type AddWebhookState } from '@/lib/actions/webhooks';

const initial: AddWebhookState = {};

export function AddWebhookForm() {
  const [state, formAction, pending] = useActionState(addWebhookAction, initial);

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div className="grow">
          <label htmlFor="url" className="block text-xs font-medium text-slate-600">
            Endpoint URL
          </label>
          <input
            id="url"
            name="url"
            type="url"
            required
            placeholder="https://example.com/webhooks/secureflow"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {pending ? 'Adding…' : 'Add endpoint'}
        </button>
      </form>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      {state.secret && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Signing secret — copy it now, it won&apos;t be shown again.
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Verify deliveries with the <code className="font-mono">X-SecureFlow-Signature</code>{' '}
            header: <code className="font-mono">HMAC-SHA256(&quot;{`{t}.{body}`}&quot;)</code>.
          </p>
          <code className="mt-2 block overflow-x-auto rounded-md bg-white px-3 py-2 font-mono text-sm text-slate-800 select-all">
            {state.secret}
          </code>
        </div>
      )}
    </div>
  );
}
