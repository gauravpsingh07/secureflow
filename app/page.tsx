import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-indigo-600 uppercase">
        Security posture + threat detection
      </p>
      <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        SecureFlow
      </h1>
      <p className="mt-4 max-w-xl text-lg text-slate-600">
        Ingest security events, detect suspicious logins with explainable scoring, scan for leaked
        secrets, and review your access posture — all multi-tenant and audited.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/sign-in"
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Sign in
        </Link>
        <Link
          href="/sign-up"
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Create workspace
        </Link>
      </div>
    </main>
  );
}
