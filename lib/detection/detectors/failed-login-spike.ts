import type { Detector, DetectionContext, DetectionResult, DetectorEvent, Severity } from '../types';

const KEY = 'failed-login-spike';
const MIN_FAILURES = 8; // per actor within the window
const HIGH = 15;
const CRITICAL = 25;

function severityFor(count: number): Severity {
  if (count >= CRITICAL) return 'critical';
  if (count >= HIGH) return 'high';
  return 'medium';
}

/**
 * Flags an account hit by an unusual number of failed logins inside the window —
 * the classic single-account brute-force signature.
 */
export const failedLoginSpike: Detector = {
  key: KEY,
  label: 'Failed-login spike',
  run(ctx: DetectionContext): DetectionResult[] {
    const byActor = new Map<string, DetectorEvent[]>();
    for (const e of ctx.events) {
      if (e.type !== 'LOGIN_FAILURE') continue;
      const actor = e.actorEmail ?? 'unknown';
      const arr = byActor.get(actor) ?? [];
      arr.push(e);
      byActor.set(actor, arr);
    }

    const results: DetectionResult[] = [];
    for (const [actor, failures] of byActor) {
      if (failures.length < MIN_FAILURES) continue;
      const count = failures.length;
      const ips = new Set(failures.map((f) => f.ip ?? 'unknown'));
      results.push({
        detectorKey: KEY,
        severity: severityFor(count),
        score: Math.min(100, Math.round((count / CRITICAL) * 100)),
        title: `Failed-login spike for ${actor}`,
        explanation: `${count} failed logins for ${actor} from ${ips.size} IP${ips.size === 1 ? '' : 's'} within ${ctx.windowMinutes} min (threshold ${MIN_FAILURES}).`,
        evidence: {
          actor,
          failures: count,
          distinctIps: ips.size,
          windowMinutes: ctx.windowMinutes,
          threshold: MIN_FAILURES,
        },
        eventIds: failures.map((f) => f.id),
        dedupeKey: `${KEY}:${actor}`,
      });
    }
    return results;
  },
};
