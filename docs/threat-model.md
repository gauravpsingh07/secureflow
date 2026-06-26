# Threat model

A lightweight STRIDE-style threat model for SecureFlow. It documents what we protect, the
trust boundaries, and how the design mitigates the main threats.

## Assets

- **Tenant data** — security events, alerts, audit logs, members.
- **Credentials** — user passwords, ingestion API keys, session tokens.
- **Secrets submitted to the scanner** — must never be persisted in the clear.
- **The audit log** — its integrity is itself a security property.

## Trust boundaries

```
Browser ──(HTTPS, session cookie)──► Next.js server ──► Postgres
External systems ──(API key)──► /api/v1/events
Vercel Cron ──(Bearer secret)──► /api/jobs/run
```

Everything inside the Next.js server is trusted; everything crossing a boundary is
authenticated and authorized.

## Actors

- **Anonymous** — landing page, sign-in, invite acceptance only.
- **Members** — `VIEWER` < `ANALYST` < `ADMIN` < `OWNER`, enforced by RBAC.
- **Machines** — holders of an ingestion API key (one tenant each).

## Threats & mitigations

| STRIDE | Threat | Mitigation |
|--------|--------|------------|
| **Spoofing** | Forged identity / session | NextAuth (Auth.js) with signed JWT sessions; bcrypt password hashing; optional **TOTP two-factor auth** (RFC 6238); middleware gates every non-public route. |
| **Spoofing** | Forged ingestion calls | API keys are random, stored only as SHA-256 hashes, verified per request, and revocable. |
| **Tampering** | Cross-tenant data access | Two-layer isolation: an application query-scoping layer (`lib/db/tenant.ts`) **and** Postgres Row-Level Security keyed on `app.current_tenant`. |
| **Tampering** | Altering history | The audit log is append-only — a database trigger rejects `UPDATE`s. |
| **Repudiation** | "I didn't do that" | Every sensitive mutation writes an immutable audit entry with actor, action, target, and metadata. |
| **Information disclosure** | Leaking scanned secrets | Findings store only a masked value (`sk_l…klmn`); the raw secret is never persisted. |
| **Information disclosure** | Password/key exposure | Passwords and API keys are hashed at rest; raw keys are shown once. |
| **Denial of service** | Ingestion flooding | Per-key token-bucket rate limiting on `/api/v1/events`; payload size caps. |
| **Elevation of privilege** | Acting beyond one's role | `requireRole` guards on every privileged action; risky actions require an owner's approval. |

## Defense in depth

- Tenant isolation is enforced in **two** independent layers, so a bug in one doesn't leak data.
- Risky bulk actions (revoke all keys, bulk-resolve) need an explicit owner approval.
- A read-only `DEMO_MODE` blocks all mutations for the public showcase.

## Residual risks / future work

- **RLS is permissive when the GUC is unset** (so the owner connection works); full
  production hardening connects the app as a non-owner role that can't bypass RLS.
- **Geo is trusted from the event payload**, not derived from IP — a spoofed payload could
  evade impossible-travel. Enrich via a GeoIP database in production.
- **In-process rate limiter and realtime bus** don't span instances — move to Redis to scale out.
- **MFA is optional and TOTP-only** — enforcing it per-tenant and adding WebAuthn/passkeys would harden it further.
