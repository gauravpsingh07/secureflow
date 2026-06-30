# Detection methodology

SecureFlow's detection engine turns raw security events into **explainable** alerts. Every
finding carries a human-readable reason and the numbers behind it — there is no black box.

## Pipeline

```
SecurityEvent rows ──► load window + baseline ──► run detectors ──► DetectionResult[]
                                                                          │
                                              correlate by dedupeKey ──►  Alert (+ AlertEvent links)
```

Each detection pass (`lib/detection/run.ts`) loads a tenant's events from the last
`BASELINE_DAYS` (7) and splits them at `windowStart`:

- **window** — events in the last `DETECTION_WINDOW_MINUTES` (default 15). What we judge.
- **baseline** — older events. What "normal" looks like.

Detectors are **pure functions** of that context (`Detector.run(ctx): DetectionResult[]`), so
they run, test, and evaluate without a database. The worker (`scripts/worker.ts`) or the cron
route (`/api/jobs/run`) drives passes; `lib/detection/persist.ts` writes results as alerts.

## Detectors

| Key | Signal | Logic | Severity |
|-----|--------|-------|----------|
| `failed-login-spike` | Single-account brute force | ≥ 8 failed logins for one actor in the window | medium → critical by count |
| `credential-stuffing` | Password spray | One IP fails against ≥ 5 distinct accounts | high → critical by account count |
| `impossible-travel` | Account sharing / takeover | Two successful logins whose distance ÷ time implies > 900 km/h | high → critical by speed |
| `new-device-ip` | First-seen access | Known account logs in from an IP/device never seen in baseline | low → medium |
| `anomalous-login-rate` | Volume outlier | Window auth count is a high **z-score** vs the actor's per-window baseline | medium → critical by z |
| `account-takeover` | Brute force that landed | ≥ 5 failed logins **followed by a success** for one actor | high → critical by failure count |
| `privilege-escalation` | Rapid access grants | ≥ 3 `PERMISSION_CHANGE` events by one actor in the window | medium → critical by count |

### Why these seven

They cover the common account-attack surface: high-volume single-target (spike), high-volume
multi-target (stuffing), geographic impossibility (travel), unfamiliar origin (new device/IP),
statistical outliers (anomalous rate), a brute force that **succeeded** (account takeover), and
rapid access grants (privilege escalation). Most are crisp rules; the anomalous-rate detector is
statistical and catches what fixed thresholds miss. Together they span both failed *and*
successful compromise, plus post-access abuse.

## Explainability & scoring

Every `DetectionResult` includes:

- **`explanation`** — a sentence a human can act on, e.g.
  *"203.0.113.66 attempted 28 failed logins across 1 account within 15 min."*
- **`evidence`** — the structured numbers (counts, distinct IPs, distance, z-score…) so the
  alert can be audited.
- **`score`** — 0–100, normalized from each detector's own scale (count ratio, implied speed,
  z-score) so alerts sort consistently.
- **`eventIds`** — the exact events that triggered it, linked via `AlertEvent`.

The anomalous-rate detector buckets the baseline into window-sized slots and counts **idle
slots as zero**, so a quiet account's sudden burst yields a high z-score instead of being
averaged away.

## Correlation (dedupe)

Each result has a stable **`dedupeKey`** (e.g. `failed-login-spike:carol@x`). Persistence
correlates by it: a repeat firing updates the existing alert's score/evidence/`lastSeen`
instead of creating duplicates, and never overrides an analyst's triage `status`. One incident
= one alert.

## Evaluation

`scripts/eval.ts` runs every detector over a labeled dataset (`lib/detection/eval-data.ts`) of
positive and negative scenarios and reports **precision/recall**, failing (non-zero exit) on any
false positive or false negative. It is pure and deterministic, so it can gate CI.

## Limitations & production hardening

- **Thresholds are static** in code; a real deployment would make them tunable per tenant
  (the schema and UI for this arrive in a later phase).
- **Geo is taken from the event payload**, not derived from IP — production would enrich via a
  GeoIP database.
- **The rate limiter and baseline are in-process**; at scale, move baselines to a materialized
  store and the limiter to Redis.
- **No ML by design** — explainable statistics are easier to trust, tune, and defend than an
  opaque model, which is the right trade-off for security tooling.
