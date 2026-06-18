import type { Detector, DetectionContext, DetectionResult, DetectorEvent, Severity } from '../types';
import { zScore } from '../stats';

const KEY = 'anomalous-login-rate';
const FLOOR = 5; // ignore actors with fewer than this many events in the window
const MIN_BUCKETS = 5; // need enough history to trust the baseline
const Z_MEDIUM = 3;
const Z_HIGH = 5;
const Z_CRITICAL = 8;

function isAuth(e: DetectorEvent): boolean {
  return e.type === 'LOGIN_SUCCESS' || e.type === 'LOGIN_FAILURE';
}

function severityFor(z: number): Severity {
  if (z >= Z_CRITICAL) return 'critical';
  if (z >= Z_HIGH) return 'high';
  return 'medium';
}

/**
 * Flags an account whose auth volume in the current window is a statistical
 * outlier versus its own history. The baseline is bucketed into window-sized
 * slots (idle slots counted as zero) so a sudden burst shows up as a high
 * z-score rather than being averaged away.
 */
export const anomalousLoginRate: Detector = {
  key: KEY,
  label: 'Anomalous login rate',
  run(ctx: DetectionContext): DetectionResult[] {
    if (ctx.baseline.length === 0) return [];
    const windowMs = ctx.windowMinutes * 60_000;
    if (windowMs <= 0) return [];

    let earliest = Infinity;
    for (const e of ctx.baseline) earliest = Math.min(earliest, e.occurredAt.getTime());
    const totalBuckets = Math.floor((ctx.windowStart.getTime() - earliest) / windowMs);
    if (totalBuckets < MIN_BUCKETS) return [];

    // baseline: actor -> (bucketIndex -> count)
    const base = new Map<string, Map<number, number>>();
    for (const e of ctx.baseline) {
      if (!isAuth(e)) continue;
      const actor = e.actorEmail ?? 'unknown';
      const bucket = Math.floor((e.occurredAt.getTime() - earliest) / windowMs);
      const m = base.get(actor) ?? new Map<number, number>();
      m.set(bucket, (m.get(bucket) ?? 0) + 1);
      base.set(actor, m);
    }

    // current window: actor -> count + contributing events
    const current = new Map<string, DetectorEvent[]>();
    for (const e of ctx.events) {
      if (!isAuth(e)) continue;
      const actor = e.actorEmail ?? 'unknown';
      const arr = current.get(actor) ?? [];
      arr.push(e);
      current.set(actor, arr);
    }

    const results: DetectionResult[] = [];
    for (const [actor, events] of current) {
      const count = events.length;
      if (count < FLOOR) continue;

      const counts = [...(base.get(actor)?.values() ?? [])];
      const sum = counts.reduce((a, b) => a + b, 0);
      const m = sum / totalBuckets;
      const zeroBuckets = totalBuckets - counts.length;
      const ss = counts.reduce((a, c) => a + (c - m) ** 2, 0) + zeroBuckets * m ** 2;
      const sd = totalBuckets > 1 ? Math.sqrt(ss / (totalBuckets - 1)) : 0;
      const z = zScore(count, m, sd);
      if (z < Z_MEDIUM) continue;

      const zClamped = Number.isFinite(z) ? Math.round(z * 10) / 10 : 999;
      const zLabel = Number.isFinite(z) ? zClamped.toString() : '∞';
      results.push({
        detectorKey: KEY,
        severity: severityFor(z),
        score: Math.min(100, Math.round((zClamped / Z_CRITICAL) * 100)),
        title: `Anomalous login rate for ${actor}`,
        explanation: `${actor} had ${count} auth events this window vs a baseline mean of ${
          Math.round(m * 10) / 10
        } (±${Math.round(sd * 10) / 10}) — z=${zLabel}.`,
        evidence: {
          actor,
          current: count,
          baselineMean: Math.round(m * 100) / 100,
          baselineStddev: Math.round(sd * 100) / 100,
          zScore: zClamped,
          buckets: totalBuckets,
        },
        eventIds: events.map((e) => e.id),
        dedupeKey: `${KEY}:${actor}`,
      });
    }
    return results;
  },
};
