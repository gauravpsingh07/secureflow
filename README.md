# SecureFlow

> **SaaS Security Posture + Threat Detection Platform**

A multi-tenant security console that ingests login/security events, detects threats with
**explainable** scoring, scans for leaked secrets, and gives admins an auditable, role-aware
view of their security posture.

See **[PLAN.md](./PLAN.md)** for the full architecture, data model, and phased build plan.

## Features

- **Explainable threat detection** — failed-login spikes, anomalous login rate (z-score),
  impossible travel, new device/IP, credential stuffing. Every alert stores *why* it fired.
- **Secret / API-key scanner** — regex + entropy detection for AWS, GitHub, Stripe, Slack,
  GCP and generic high-entropy secrets, with severity and remediation.
- **Multi-tenant by design** — isolation enforced in two layers: an application query-scoping
  layer and Postgres Row-Level Security.
- **Auditable** — append-only audit log + admin approval workflow for risky actions.
- **Live** — realtime alert feed via Server-Sent Events.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Prisma 7 + Postgres · NextAuth v5 · Zod ·
Tailwind v4 · Vitest + Playwright · GitHub Actions.

## Getting started

```bash
pnpm install
cp .env.example .env          # then set AUTH_SECRET (see the comment in the file)
docker compose up -d          # local Postgres on :5432
pnpm db:migrate               # apply migrations
pnpm db:seed                  # load the demo incident narrative
pnpm dev                      # http://localhost:3000
```

Run the detection worker in a second terminal:

```bash
pnpm worker
```

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the app |
| `pnpm worker` | Run the detection loop |
| `pnpm generate:events` | Push synthetic events through the ingestion API |
| `pnpm test` / `pnpm test:int` | Unit / integration tests |
| `pnpm e2e` | Playwright end-to-end tests |
| `pnpm eval` | Detector precision/recall on labeled data |

## License

MIT
