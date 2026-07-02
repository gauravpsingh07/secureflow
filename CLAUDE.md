# SecureFlow — project context

Multi-tenant **SaaS security posture + threat detection platform**. Portfolio project #1
(cybersecurity) of a 4-domain strategy; #2 will be LedgerGuard (fintech). Built to be deep and
demo-able: two centerpieces — an **explainable detection engine** and a **secret scanner** —
plus a full governed console around them.

- **Repo:** https://github.com/gauravpsingh07/secureflow (public; both CI workflows green)
- **Status:** feature-complete, ~89 commits, NOT yet deployed (Vercel + Neon config ready)
- **Source of truth:** `PLAN.md` (phased build plan + up-to-date Progress/Current-state section)
- **Docs:** `docs/architecture.md`, `docs/detection-methodology.md`, `docs/threat-model.md`, `docs/deploy.md`

## Stack (mirrors D:\Projects\helpdesk — keep consistent)

Next.js 16 App Router + React 19 + TypeScript · Prisma 7 + Postgres (`@prisma/adapter-pg`,
client generated to `lib/generated/prisma`) · NextAuth v5 credentials (JWT carries
`tenantId` + `role`) · Zod · Tailwind v4 · Vitest (unit + integration) · Playwright · pnpm.
Server components for reads, server actions for writes (`lib/actions/*`).

## What's built

- **Auth & tenancy:** flat model — `Tenant` + `User.tenantId` + `User.role`
  (OWNER/ADMIN/ANALYST/VIEWER), invites. Two-layer isolation: every tenant query goes through
  `lib/db/tenant.ts` (injects tenantId; models listed in `TENANT_MODELS`) **and** Postgres RLS
  keyed on the `app.current_tenant` GUC (`lib/db/rls.ts`). **TOTP MFA** (RFC 6238,
  `lib/auth/totp.ts`, pure node:crypto) — optional, enrollment at `/settings/security`.
- **Ingestion:** `POST /api/v1/events` — X-API-Key auth (SHA-256-hashed keys), Zod validation,
  normalization, per-key token-bucket rate limit. Synthetic generator: `pnpm generate:events`.
- **Detection engine (centerpiece):** 7 pure-function detectors in `lib/detection/detectors/`
  (failed-login-spike, anomalous-login-rate z-score, impossible-travel, new-device-ip,
  credential-stuffing, account-takeover, privilege-escalation). Registry in
  `lib/detection/registry.ts`; tunable thresholds via `DetectorSetting` + `lib/detection/config.ts`;
  alerts dedupe/correlate by `dedupeKey` and store `explanation` + `evidence`. Runs via
  `pnpm worker`, the `/api/jobs/run` cron route, or the in-app "Run detection now".
  Eval harness `pnpm eval` — 100% precision/recall on 9 labeled scenarios (CI-gateable).
- **Console:** alerts triage (open/ack/resolved) + detail w/ evidence timeline + remediation,
  realtime SSE feed (`lib/realtime.ts`, in-process bus), posture dashboard, events explorer,
  access-review `/risk`, notifications, admin approval workflow for risky actions.
- **Secret scanner (centerpiece):** regex + Shannon entropy (`lib/scanner/`), rules for
  AWS/GitHub/Stripe/Slack/GCP/private keys/JWT/generic; paste/upload UI; findings masked.
  `pnpm scan` gates CI (`.github/workflows/secret-scan-demo.yml`).
- **Audit log:** append-only, written on every mutation (`lib/audit.ts`), searchable, CSV/JSON
  export, UPDATEs rejected by DB trigger (migration `0010`).
- **Outbound webhooks:** alerts POSTed to tenant endpoints — HMAC-SHA256 signed
  (`X-SecureFlow-Signature: t=<unix>,v1=<hex>` over `${t}.${body}`, `lib/webhooks/sign.ts`),
  idempotent (`(endpointId,eventKey)` unique + stable delivery id), retried 0/1m/5m/15m/1h
  (`lib/webhooks/retry.ts`), processed alongside detection. UI at `/settings/webhooks`.
- **Demo:** `pnpm db:seed` builds the "Northwind" tenant — users owner@/admin@/analyst@/viewer@
  `northwind.test` / `demodemo`, a week of traffic + live incidents that fire real alerts, a
  seeded secret scan and webhook endpoint. `DEMO_MODE=true` = public read-only (all server
  actions guarded via `lib/demo.ts`).

## Commands

`pnpm dev` · `pnpm worker` · `pnpm test` (56 unit) · `pnpm test:int` (needs Postgres) ·
`pnpm e2e` · `pnpm eval` · `pnpm scan` · `pnpm lint` / `typecheck` / `build` ·
`pnpm db:migrate` / `db:seed`. Local DB: `docker compose up -d`.

## Conventions & gotchas (hard-won — read before changing things)

- **Green commits:** small Conventional Commits; every commit passes typecheck/lint/tests.
  End commit messages with the Claude Co-Authored-By trailer.
- **New tenant-scoped models:** add to `TENANT_MODELS` in `lib/db/tenant.ts` AND append RLS
  policies in the migration (copy pattern from `0002_rls`). Pass `tenantId` explicitly on creates.
- **Migrations are authored offline** (Docker usually not running locally):
  `git show HEAD:prisma/schema.prisma > /tmp/old.prisma && node node_modules/prisma/build/index.js
  migrate diff --from-schema /tmp/old.prisma --to-schema prisma/schema.prisma --script >
  prisma/migrations/00NN_name/migration.sql` then `pnpm exec prisma generate`. Integration/e2e
  verify in CI (postgres:16 service).
- **RLS testing:** the `postgres` superuser **bypasses RLS even with FORCE** — tests must
  `SET LOCAL ROLE` to a NOSUPERUSER role (see `tests/integration/tenant-isolation.test.ts`).
- **GitHub push protection:** never commit a contiguous secret-shaped literal (even fake
  `sk_live_…`) — assemble at runtime (see `secret-scan-demo.yml`). History was scrubbed once.
- **pnpm 11:** build scripts approved via `allowBuilds:` in `pnpm-workspace.yaml` (not
  package.json). `pnpm/action-setup@v4` Node-20 warning in CI is expected + harmless.
- **rtk shell proxy quirk:** cwd sometimes resets to D:\job-finder\emails between Bash calls —
  `cd /d/Projects/secureflow` first. `rg` may be missing; Grep tool still works.
- New detector checklist: pure detector file + registry + `DETECTOR_PARAMS` + remediation text
  + unit tests + eval scenario (+ seed/generator scenario so the demo fires it).

## What's next (owner's call)

1. **Deploy live** — Vercel + Neon per `docs/deploy.md`, run seed, set `DEMO_MODE=true`.
2. README screenshots; GitHub topics/description; resume/LinkedIn link.
3. Start **LedgerGuard** (fintech, `D:\Projects\ledgerguard`) reusing this foundation.
