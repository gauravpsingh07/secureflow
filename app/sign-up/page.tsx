'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signUpAction, type SignUpState } from '@/lib/actions/onboarding';

const initialState: SignUpState = {};

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your workspace</h1>
        <p className="mt-1 text-sm text-slate-500">
          You&apos;ll be the owner and can invite your team next.
        </p>

        <form action={formAction} className="mt-8 space-y-4">
          <Field name="organizationName" label="Workspace name" autoComplete="organization" />
          <Field name="name" label="Your name" autoComplete="name" />
          <Field name="email" label="Work email" type="email" autoComplete="email" />
          <Field
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters."
          />

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
            {pending ? 'Creating…' : 'Create workspace'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/sign-in" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  name,
  label,
  type = 'text',
  autoComplete,
  hint,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
      />
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
