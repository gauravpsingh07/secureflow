# Architecture

## Request & detection flow

```
                         ┌─────────────────────────────────────────┐
   External / generator  │              Next.js (App Router)         │
   ──────────────────►   │                                           │
   POST /api/v1/events   │  API routes ──► Zod validate ──► scoped   │
   (API-key auth)        │                                  Prisma   │
                         │                                    │      │
                         │                                    ▼      │
   Vercel Cron ───────►  │  /api/jobs/run ──► detection ─► ┌───────┐ │
   (every 5 min)         │                   engine        │Postgres│ │
                         │                   (5 detectors) │ events │ │
   pnpm worker ───────►  │                         │       │ alerts │ │
   (local loop)          │                         ▼       │ audit  │ │
                         │                   persist+dedupe └───┬────┘ │
                         │                         │            │      │
   Browser ◄── SSE ──────┤  Dashboard · Alerts · Events ·       │      │
   (live alert feed)     │  Scanner · Risk · Audit ◄────────────┘      │
                         └─────────────────────────────────────────┘
```

## Layers

- **Routes / pages** (`app/`) — server components for reads, server actions for writes.
- **Domain logic** (`lib/`) — detection engine, secret scanner, auth/RBAC, tenant scoping,
  audit, realtime. The detection and scanner cores are pure functions, so they're unit-tested
  and evaluated without a database.
- **Data** (`prisma/`) — Postgres via Prisma with a driver adapter; isolation enforced by the
  tenant-scope client and Row-Level Security.

## Key data model

| Model | Purpose |
| --- | --- |
| `Tenant`, `User`, `Invite` | Multi-tenant identity + RBAC (role on user) |
| `ApiKey` | Hashed, rate-limited ingestion credentials |
| `SecurityEvent` | Normalized login/security telemetry |
| `Alert`, `AlertEvent` | Detection output, correlated by `dedupeKey`, linked to events |
| `DetectorSetting` | Per-tenant enable/disable + thresholds |
| `ApprovalRequest` | Owner sign-off for risky actions |
| `Notification` | In-app alerts |
| `SecretScan`, `SecretFinding` | Secret-scan runs + masked findings |
| `WebhookEndpoint`, `WebhookDelivery` | Outbound webhooks; HMAC-signed, idempotent, retried |
| `AuditLog` | Append-only, DB-enforced action history |

## Isolation

Every tenant-scoped query passes through `lib/db/tenant.ts`, which injects `tenantId`. Postgres
RLS policies are a second, independent layer (`lib/db/rls.ts` sets the `app.current_tenant`
GUC). See [threat-model.md](./threat-model.md).
