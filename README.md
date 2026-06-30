# SecureFlow

> **SaaS Security Posture + Threat Detection Platform**

A multi-tenant security console that ingests login/security events, detects threats with
**explainable** scoring, scans for leaked secrets, and gives admins an auditable, role-aware
view of their security posture.

## Demo

After `pnpm db:seed`, sign in to the **Northwind** workspace:

- `owner@northwind.test` / `demodemo` (also `admin@`, `analyst@`, `viewer@`)

The seed loads a week of traffic plus live incidents (a brute-force burst, an impossible-travel
login, credential stuffing) that fire real alerts, and a secret scan with planted findings. Set
`DEMO_MODE=true` for a public read-only deployment.

## Features

- **Explainable threat detection** — seven detectors: failed-login spikes, anomalous login rate
  (z-score), impossible travel, new device/IP, credential stuffing, account takeover (brute force
  that landed), and privilege escalation. Every alert stores *why* it fired and the evidence
  behind it. Scored against a labeled dataset at 100% precision/recall (`pnpm eval`).
- **Secret / API-key scanner** — regex + Shannon-entropy detection for AWS, GitHub, Stripe,
  Slack, GCP, private keys, JWTs, and generic high-entropy secrets, with severity and remediation.
- **Multi-tenant by design** — isolation enforced in two layers: an application query-scoping
  layer and Postgres Row-Level Security.
- **Live console** — realtime alert feed (SSE), posture dashboard, alerts triage workflow,
  events explorer, and an access-review/risk page.
- **Governed & auditable** — RBAC, optional **TOTP two-factor auth**, tunable detection rules, an
  admin approval workflow for risky actions, and an **append-only audit log enforced by a
  database trigger**.
- **Ingestion API** — a rate-limited, API-key-authenticated `POST /api/v1/events`.
- **Outbound webhooks** — alerts POSTed to your systems, **HMAC-signed**, idempotent, and
  **retried with exponential backoff**, with a delivery log.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Prisma 7 + Postgres · NextAuth v5 · Zod ·
Tailwind v4 · Vitest + Playwright · GitHub Actions.

## Getting started

```bash
pnpm install
cp .env.example .env          # then set AUTH_SECRET (see the comment in the file)
docker compose up -d          # local Postgres on :5432
pnpm db:migrate               # apply migrations
pnpm db:seed                  # load the Northwind demo
pnpm dev                      # http://localhost:3000
```

Run the detection worker in a second terminal (or trigger it from the Alerts page):

```bash
pnpm worker
```

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the app |
| `pnpm worker` | Run the detection loop |
| `pnpm generate:events` | Push synthetic events through the ingestion API |
| `pnpm scan` | Scan source for committed secrets (CI gate) |
| `pnpm eval` | Detector precision/recall on labeled data |
| `pnpm test` / `pnpm test:int` | Unit / integration tests |
| `pnpm e2e` | Playwright end-to-end tests |

## Docs

- [PLAN.md](./PLAN.md) — phased, commit-by-commit build plan
- [docs/architecture.md](./docs/architecture.md) — flow, layers, data model
- [docs/detection-methodology.md](./docs/detection-methodology.md) — how the detectors work
- [docs/threat-model.md](./docs/threat-model.md) — STRIDE-style threat model
- [docs/deploy.md](./docs/deploy.md) — Vercel + Neon deployment

## License

MIT
