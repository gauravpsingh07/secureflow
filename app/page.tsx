import Link from 'next/link';
import { isDemoMode } from '@/lib/demo';

const FEATURES = [
  {
    title: 'Explainable threat detection',
    body: 'Failed-login spikes, anomalous rates (z-score), impossible travel, new device/IP, and credential stuffing — every alert says exactly why it fired.',
  },
  {
    title: 'Secret scanner',
    body: 'Regex + Shannon-entropy detection for AWS, GitHub, Stripe, Slack, GCP, private keys and JWTs, with severity and remediation.',
  },
  {
    title: 'Multi-tenant by design',
    body: 'Isolation enforced in two layers: an application query-scoping layer and Postgres Row-Level Security.',
  },
  {
    title: 'Governed & audited',
    body: 'Role-based access, an admin approval workflow for risky actions, and an append-only audit log enforced at the database.',
  },
  {
    title: 'Live console',
    body: 'A realtime alert feed over SSE, a posture dashboard, access-review, and tunable detection rules.',
  },
  {
    title: 'Ingestion API',
    body: 'Send events to a rate-limited, API-key-authenticated endpoint — or use the built-in synthetic generator.',
  },
];

const STEPS = ['Ingest events', 'Run detectors', 'Correlate into alerts', 'Triage in the console'];

export default function Home() {
  const demo = isDemoMode();

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between px-6 py-5">
        <span className="text-sm font-bold tracking-tight text-slate-900">SecureFlow</span>
        <Link href="/sign-in" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
          Sign in
        </Link>
      </header>

      <main className="flex flex-col items-center px-6 py-16 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-indigo-600 uppercase">
          Security posture + threat detection
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          A multi-tenant security console with explainable detection
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-600">
          Ingest login and security events, detect threats with transparent scoring, scan for
          leaked secrets, and triage it all in a live, audited, role-aware console.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/sign-in"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            {demo ? 'Open the live demo' : 'Sign in'}
          </Link>
          {!demo && (
            <Link
              href="/sign-up"
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Create workspace
            </Link>
          )}
        </div>

        {demo && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
            Demo sign-in: <span className="font-mono">owner@northwind.test</span> /{' '}
            <span className="font-mono">demodemo</span>
            <span className="text-slate-400"> · also admin@ / analyst@ / viewer@</span>
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
          {STEPS.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">{s}</span>
              {i < STEPS.length - 1 && <span className="text-slate-300">→</span>}
            </span>
          ))}
        </div>

        <div className="mt-16 grid max-w-4xl gap-5 text-left sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mt-auto px-6 py-8 text-center text-xs text-slate-400">
        Built with Next.js, Prisma, and Postgres · explainable security, no black boxes.
      </footer>
    </div>
  );
}
