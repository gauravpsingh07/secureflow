'use client';

import { useActionState, useState, useTransition } from 'react';
import {
  beginMfaSetupAction,
  confirmMfaAction,
  type MfaSetupState,
  type ConfirmMfaState,
} from '@/lib/actions/security';

const confirmInit: ConfirmMfaState = {};

export function MfaSetup() {
  const [setup, setSetup] = useState<MfaSetupState>({});
  const [beginPending, startBegin] = useTransition();
  const [confirm, confirmAction, confirmPending] = useActionState(confirmMfaAction, confirmInit);

  function begin() {
    startBegin(async () => {
      setSetup(await beginMfaSetupAction());
    });
  }

  if (!setup.secret) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={begin}
          disabled={beginPending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {beginPending ? 'Generating…' : 'Set up 2FA'}
        </button>
        {setup.error && <p className="text-sm text-red-600">{setup.error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-800">
          1. Add this key to your authenticator app
        </p>
        <code className="mt-2 block font-mono text-sm break-all text-slate-800 select-all">
          {setup.secret}
        </code>
        <p className="mt-2 text-xs break-all text-slate-400">{setup.uri}</p>
      </div>

      <form action={confirmAction} className="flex items-end gap-3">
        <div className="grow">
          <label htmlFor="token" className="block text-xs font-medium text-slate-600">
            2. Enter the 6-digit code
          </label>
          <input
            id="token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={confirmPending}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {confirmPending ? 'Verifying…' : 'Verify & enable'}
        </button>
      </form>
      {confirm.error && <p className="text-sm text-red-600">{confirm.error}</p>}
    </div>
  );
}
