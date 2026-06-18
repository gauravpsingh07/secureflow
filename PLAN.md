# SecureFlow — Master Build Plan

> **SaaS Security Posture + Threat Detection Platform**
> A multi-tenant security console that ingests login/security events, detects threats
> with explainable scoring, scans for leaked secrets, and gives admins an auditable,
> role-aware view of their security posture.

This is the single source of truth for the project: context, scope, architecture, data
model, and a phased, commit-by-commit build plan targeting **~56–60 commits**.

---

## Progress

- ✅ **Phase 0 — Foundation** (7 commits): Next.js 16 + TS + Tailwind v4, Prisma 7 +
  Postgres, Vitest/Playwright, ESLint/Prettier, GitHub Actions CI, app shell + UI
  primitives. Verified green: typecheck, lint, unit tests, production build.
- ✅ **Phase 1 — Auth & multi-tenancy** (9 commits): Tenant/User/Invite models, NextAuth v5
  credentials with JWT (tenantId+role), sign-in/sign-up + tenant onboarding,
  tenant-scoped Prisma layer, RBAC guards + authed shell, Postgres RLS, team/invite flow,
  isolation + RBAC tests. Integration/e2e tests run in CI (need Postgres).
- ⏳ **Next: Phase 2 — Event ingestion & API keys.**

> **Implementation note (deviation from §5 below):** to stay consistent with the existing
> `helpdesk` codebase, multi-tenancy uses a **flat model** — a `Tenant` plus `User.tenantId`
> + `User.role` (and an `Invite` model) — rather than a separate `Organization` + `Membership`
> join. One tenant per user; isolation is enforced by `lib/db/tenant.ts` (app layer) and
> Postgres RLS via `lib/db/rls.ts` (`app.current_tenant` GUC). The §5 table still lists the
> originally-planned shape for the not-yet-built models.

---

## 1. Why this project exists (positioning)

This is portfolio project **#1 of a domain-coverage strategy**, but it is built and judged
**entirely on its own merits** — nothing here depends on future projects.

**The job-hunt thesis.** My existing projects (AgentCanary, AgentOps Firewall, Helpdesk AI,
SignalForge) already prove *AI security* — policy engines, audit logs, approval workflows,
prompt-injection defense, PII redaction. What they do **not** show is **traditional security
engineering**. SecureFlow closes exactly those gaps:

| Gap in current portfolio | Covered by SecureFlow |
|---|---|
| Vulnerability / secret scanning | Secret & API-key scanner with entropy + rule detection |
| Suspicious-login / threat detection | Explainable detection engine (5+ detectors) |
| SIEM-style log ingestion & search | Event ingestion API + searchable event store |
| IAM / access risk | Role/permission risk dashboard + access review |
| Security posture dashboards | Multi-tenant posture KPIs + alerting |
| Audit & access controls | Append-only audit log + admin approval workflows |

**Personal-brand line this reinforces:**
*Full-stack engineer focused on AI security, platform reliability, and governed automation.*

**What "done" looks like:** a **publicly deployed, clickable demo** seeded with a believable
incident narrative, real (explainable) detections firing, tests passing, and a README with a
threat model. A recruiter should *see it work in 30 seconds*.

---

## 2. Scope (this project only)

### The two centerpieces (these are what make it "excellent", not a CRUD demo)

1. **Threat detection that actually fires** — ingest login/security events, then detect
   suspicious logins, failed-login spikes, impossible travel, new-device, and
   credential-stuffing patterns using **explainable statistical scoring** (z-scores, rolling
   baselines, rate thresholds). Every alert stores *why* it fired and the evidence behind it.

2. **A working secret / API-key scanner** — paste a repo snippet, config, or file; it flags
   leaked credentials (AWS, GitHub, Stripe, Slack, GCP, generic high-entropy) with severity,
   masked value, location, and a remediation hint. Plus a GitHub Actions scan simulation.

### Supporting cast (the platform around the centerpieces)

- Multi-tenant orgs with RBAC (owner / admin / analyst / viewer)
- Security event explorer (filter, search, detail)
- Alerts workflow (open → acknowledged → resolved) with realtime feed
- Security posture dashboard (KPIs, trends)
- Role/permission risk dashboard (access review)
- Alert rule configuration (tunable thresholds per detector)
- Admin approval workflow for risky actions
- Append-only, searchable audit log

### Explicitly OUT of scope (don't gold-plate)

- Real ML models (explainable stats are the *feature*, not a shortcut)
- Real third-party log connectors (synthetic generator + ingestion API only)
- Billing / payments, mobile app, real email delivery (stub it)
- Anything about the other three portfolio projects

---

## 3. Tech stack (aligned with existing projects — `helpdesk`/`formflow`)

> **Decision:** match the existing portfolio stack rather than introduce Supabase.
> Consistency across projects is a hiring signal, and Prisma/Postgres/NextAuth is the more
> "backend-serious" story a security platform deserves.

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16 (App Router) + React 19 + TypeScript** | Server Actions for mutations |
| DB / ORM | **Postgres + Prisma 7** (`@prisma/adapter-pg`) | docker-compose locally |
| Auth | **NextAuth v5** (credentials) + bcrypt | mirrors `helpdesk` |
| Validation | **Zod** | all API + action inputs |
| Background jobs | **tsx worker** (`scripts/worker.ts`) | runs detection passes on a loop |
| Realtime | **Server-Sent Events (SSE)** | live alert feed; polling fallback |
| Styling | **Tailwind v4** | optional small component layer |
| Unit/Integration tests | **Vitest** | detectors + tenant isolation |
| E2E | **Playwright** | login → ingest → alert fires |
| Eval harness | **tsx** (`scripts/eval.ts`) | precision/recall on labeled data |
| Lint/Format | **ESLint + Prettier** (+ tailwind plugin) | |
| CI | **GitHub Actions** | lint, typecheck, test, build |
| Deploy | **Vercel** (app) + **Neon** (serverless Postgres) | free tiers, public demo |

### Multi-tenancy & isolation strategy (a security talking point)

- **Primary:** every query goes through a central tenant-scoped data layer
  (`lib/db/scoped.ts`) that injects `organizationId` — no raw unscoped Prisma calls in
  feature code.
- **Defense-in-depth:** Postgres **Row-Level Security** policies applied via a raw SQL
  migration, so isolation is enforced at the database even if app code slips.
- Interview line: *"tenant isolation is enforced in two layers — application query scoping
  and database RLS."*

---

## 4. Architecture

```
                         ┌─────────────────────────────────────────┐
   External / generator  │              Next.js (App Router)        │
   ──────────────────►   │                                          │
   POST /api/v1/events   │  API routes ──► Zod validate ──► scoped  │
   (API-key auth)        │                                  Prisma  │
                         │                                    │     │
                         │                                    ▼     │
                         │                              ┌───────────┐│
                         │                              │ Postgres  ││
                         │                              │  events   ││
                         │                              │  alerts   ││
                         │                              │  audit    ││
                         │                              └─────┬─────┘│
                         │                                    │      │
   tsx worker (loop) ───────► detection engine ──► alerts ────┘      │
   scripts/worker.ts     │    (5+ explainable detectors)             │
                         │                                    │      │
   Browser ◄─── SSE ─────┤  Dashboard · Alerts · Events ·     │      │
   (live alert feed)     │  Risk review · Secret scanner ◄────┘      │
                         └─────────────────────────────────────────┘
```

### Repo structure (mirrors `helpdesk`)

```
secureflow/
├─ app/                  # routes: (auth), dashboard, events, alerts, risk, scanner, settings, api/
├─ lib/
│  ├─ db/                # prisma client + scoped query layer
│  ├─ auth/              # NextAuth config, RBAC guards
│  ├─ detection/         # detector framework + individual detectors
│  ├─ scanner/           # secret-scan engine + rulesets
│  ├─ audit/             # audit-log writer
│  └─ validation/        # zod schemas
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/        # incl. raw SQL RLS migration
│  └─ seed.ts            # demo incident narrative
├─ scripts/
│  ├─ worker.ts          # detection loop
│  ├─ generate-events.ts # synthetic event generator
│  └─ eval.ts            # detector precision/recall
├─ tests/                # vitest unit + integration
├─ e2e/                  # playwright
├─ docs/                 # threat-model.md, detection-methodology.md
└─ .github/workflows/    # ci.yml, secret-scan-demo.yml
```

---

## 5. Data model (Prisma)

| Model | Key fields | Purpose |
|---|---|---|
| **Organization** | id, name, slug | tenant |
| **User** | id, email, passwordHash, name | auth principal |
| **Membership** | userId, orgId, role(`OWNER\|ADMIN\|ANALYST\|VIEWER`) | RBAC link |
| **ApiKey** | id, orgId, hashedKey, prefix, lastUsedAt, revokedAt | ingestion auth |
| **SecurityEvent** | id, orgId, type, actorEmail, ip, geo(country/city/lat/lng), userAgent, success, raw(json), occurredAt | normalized event store |
| **Detector** | key, name, enabled, config(json: thresholds) | tunable rules |
| **Alert** | id, orgId, detectorKey, severity, status(`OPEN\|ACK\|RESOLVED`), title, score, **explanation**, **evidence(json)**, firstSeen, lastSeen, dedupeKey | detection output |
| **AlertEvent** | alertId, securityEventId | links alert ↔ contributing events |
| **SecretScan** | id, orgId, source, createdAt | a scan run |
| **SecretFinding** | scanId, ruleId, severity, maskedValue, line, remediation | scan output |
| **AuditLog** | id, orgId, actorId, action, target, metadata(json), createdAt | append-only |
| **Notification** | id, orgId, userId, type, payload, readAt | in-app alerts |

Design notes:
- `Alert.explanation` (human string) + `Alert.evidence` (structured) make detections
  **explainable** — the single most important field set in the schema.
- `Alert.dedupeKey` prevents alert spam (correlate repeated patterns into one alert).
- `AuditLog` is write-only by app code; RLS + a DB trigger block updates/deletes.

---

## 6. Detection engine design

A small framework, not a pile of `if`s:

```ts
interface Detector {
  key: string;
  run(ctx: DetectionContext): Promise<DetectionResult[]>; // window of recent events
}
interface DetectionResult {
  detectorKey: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;             // explainable, normalized
  title: string;
  explanation: string;       // "5 failed logins in 60s from 3 IPs — 8x baseline"
  evidence: unknown;         // the events / numbers behind the score
  dedupeKey: string;
}
```

Detectors shipped:
1. **Failed-login spike** — count over rolling window vs. threshold.
2. **Anomalous login rate** — z-score of current rate vs. per-actor rolling baseline.
3. **Impossible travel** — two successful logins from geos too far apart for the time delta.
4. **New device / new IP** — first-seen fingerprint for an actor.
5. **Credential stuffing / brute force** — many distinct accounts from one IP, or many IPs to one account.

Scheduling: `scripts/worker.ts` runs the registry every N seconds over the recent window,
writes/updates alerts, dedupes, and emits SSE. Evaluated by `scripts/eval.ts` against a
labeled synthetic dataset (report precision/recall).

---

## 7. Phased build plan (commit-by-commit)

> Conventional Commits. Target band **50–60 commits**; this lists **~58 core + 4 polish**.
> Merge the small ones if you want to land lower in the band. Each phase ends green
> (lint + typecheck + tests pass) — that's the Definition of Done.

### Phase 0 — Foundation & tooling  *(commits 1–7)*
1. `chore: scaffold Next.js 16 + TypeScript + Tailwind v4`
2. `chore: add ESLint, Prettier, tailwind plugin, editor config`
3. `chore: add Prisma 7 + Postgres + docker-compose for local db`
4. `chore: configure Vitest (unit+integration) and Playwright`
5. `ci: add GitHub Actions — lint, typecheck, test, build`
6. `feat: app shell — layout, nav, theme, base UI primitives`
7. `docs: README skeleton + link to PLAN + architecture overview`

**DoD:** `npm run dev` boots an empty shell; CI is green.

### Phase 1 — Auth & multi-tenancy  *(commits 8–16)*
8. `feat: Prisma models — User, Organization, Membership, Role enum`
9. `feat: NextAuth v5 credentials provider + session`
10. `feat: signup + login pages with bcrypt password hashing`
11. `feat: org creation + onboarding flow`
12. `feat: tenant-scoped Prisma data layer (lib/db/scoped.ts)`
13. `feat: RBAC guards for server actions/routes (owner/admin/analyst/viewer)`
14. `feat: Postgres RLS policies via raw SQL migration (defense-in-depth)`
15. `feat: org switcher + member invite flow`
16. `test: integration tests for tenant isolation + RBAC`

**DoD:** two orgs cannot see each other's data (proven by a failing-then-passing test).

### Phase 2 — Event ingestion & API keys  *(commits 17–25)*
17. `feat: Prisma models — SecurityEvent, ApiKey`
18. `feat: API key generation, hashing, prefix display, revoke UI`
19. `feat: ingestion endpoint POST /api/v1/events (API-key auth)`
20. `feat: Zod schemas + normalization for event payloads`
21. `feat: rate limiting on ingestion endpoint`
22. `feat: synthetic event generator (scripts/generate-events.ts)`
23. `feat: events explorer — table + filters (type/actor/ip/success)`
24. `feat: event search + pagination + detail drawer`
25. `test: ingestion + validation + rate-limit tests`

**DoD:** generator pushes 1k+ events through the real API; explorer shows them, scoped.

### Phase 3 — Detection engine (CENTERPIECE)  *(commits 26–37)*
26. `feat: detector framework — registry, DetectionResult type, context`
27. `feat: failed-login spike detector`
28. `feat: anomalous login-rate detector (z-score baseline)`
29. `feat: impossible-travel detector`
30. `feat: new-device / new-IP detector`
31. `feat: credential-stuffing / brute-force detector`
32. `feat: alert creation + dedupe/correlation (dedupeKey)`
33. `feat: detection worker loop (scripts/worker.ts)`
34. `feat: store explanation + evidence on every alert`
35. `test: unit tests per detector with fixtures`
36. `feat: eval harness — precision/recall on labeled data (scripts/eval.ts)`
37. `docs: detection-methodology.md`

**DoD:** generator can inject a brute-force burst and a matching alert fires with a
human-readable explanation; eval reports non-trivial precision/recall.

### Phase 4 — Alerts, dashboard & realtime  *(commits 38–46)*
38. `feat: alerts list + status workflow (open/ack/resolved)`
39. `feat: alert detail — timeline, evidence, recommended action`
40. `feat: realtime alert feed via SSE`
41. `feat: security posture dashboard — KPIs + trend charts`
42. `feat: role/permission risk dashboard (access review)`
43. `feat: alert rule config UI (tunable thresholds per detector)`
44. `feat: admin approval workflow for risky actions`
45. `feat: in-app notifications (+ email stub)`
46. `test: Playwright e2e — login → ingest → alert appears live`

**DoD:** opening the dashboard shows live KPIs; a new alert streams in without refresh.

### Phase 5 — Secret scanner (CENTERPIECE)  *(commits 47–52)*
47. `feat: secret-scan engine — regex rules + Shannon entropy`
48. `feat: ruleset — AWS, GitHub, Stripe, Slack, GCP, generic high-entropy`
49. `feat: scan API + paste/upload UI`
50. `feat: findings view — severity, location, masked value, remediation`
51. `ci: GitHub Actions secret-scan simulation (secret-scan-demo.yml)`
52. `test: scanner true/false-positive fixtures`

**DoD:** pasting a sample config with a fake AWS key flags it `critical` with remediation.

### Phase 6 — Audit log & access review  *(commits 53–56)*
53. `feat: append-only audit log — write on all mutations`
54. `feat: audit log search UI + filters`
55. `feat: audit export (CSV/JSON) + DB-level immutability enforcement`
56. `test: audit-log integrity tests (no update/delete)`

**DoD:** every privileged action shows up in an immutable, searchable audit trail.

### Phase 7 — Polish, demo & deploy  *(commits 57–62)*
57. `feat: demo seed — believable multi-incident tenant narrative (prisma/seed.ts)`
58. `feat: public read-only demo mode`
59. `feat: landing page — what it is, architecture, live demo link`
60. `fix: empty/loading/error states + accessibility pass`
61. `ci: deploy to Vercel + Neon Postgres; wire env + migrations`
62. `docs: final README, threat-model.md, screenshots, architecture diagram`

**DoD:** a stranger opens the public URL, lands on a seeded console with real alerts,
clicks into one, and understands what the product does — no setup required.

---

## 8. Demo & seed strategy

The seed (`prisma/seed.ts`) builds **a story, not random rows**: a demo org "Northwind"
with a normal week of traffic, then:
- a Tuesday-night **brute-force burst** → one correlated high-severity alert,
- an **impossible-travel** login (NYC then Singapore 20 min later),
- a developer who **committed an AWS key** (scanner finding),
- a couple of acknowledged/resolved alerts so the workflow looks lived-in.

This makes the demo legible in seconds and gives interview talking points.

## 9. Testing strategy

- **Vitest unit:** each detector against crafted fixtures (positive + negative).
- **Vitest integration:** tenant isolation (RLS + scoped layer), ingestion auth, audit immutability.
- **Playwright e2e:** signup → create org → ingest burst → see alert stream in → acknowledge.
- **Eval:** `scripts/eval.ts` scores detectors on a labeled synthetic dataset.

## 10. Deployment

- **App:** Vercel (connect repo, set env).
- **DB:** Neon serverless Postgres; `prisma migrate deploy` in the deploy step.
- **Seed:** run demo seed against the prod DB once; enable read-only demo mode.
- **Worker:** Vercel Cron (or a small Neon-connected scheduled function) triggers detection.

## 11. The bar — what makes this "excellent" not "average"

- [ ] Publicly deployed, seeded, clickable demo (no setup to see value)
- [ ] Detections **fire** and are **explainable** (not a filterable table)
- [ ] Secret scanner catches real patterns with remediation
- [ ] Two-layer tenant isolation (app + RLS), provable by test
- [ ] Append-only audit trail
- [ ] Meaningful tests (detectors, isolation, e2e) + eval numbers
- [ ] README with architecture diagram + `docs/threat-model.md`

## 12. Conventions

- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `ci:`, `test:`, `docs:`).
- **Branch:** trunk-based on `main`; small, green commits.
- **Each commit compiles and passes CI** — no broken intermediate states.
- **Keep `PLAN.md` updated:** check off phases as they land.

---

*Last updated: 2026-06-17 · Stack confirmed against `D:\Projects\helpdesk`.*
