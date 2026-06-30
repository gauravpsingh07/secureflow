import type { Detector, DetectionContext, DetectionResult, DetectorEvent, Severity } from '../types';
import { param } from '../config';

const KEY = 'account-takeover';
const MIN_FAILURES = 5; // failed logins before a success that suggest the brute force worked (tunable)

function severityFor(totalFailures: number): Severity {
  return totalFailures >= 15 ? 'critical' : 'high';
}

/**
 * Flags an account that, within the window, had a burst of failed logins
 * *followed by a successful one* — i.e. the brute force may have succeeded. This
 * is a higher-severity escalation of the failed-login spike (the attack landed).
 */
export const accountTakeover: Detector = {
  key: KEY,
  label: 'Possible account takeover',
  run(ctx: DetectionContext): DetectionResult[] {
    const minFailures = param(ctx, KEY, 'minFailures', MIN_FAILURES);

    const byActor = new Map<string, DetectorEvent[]>();
    for (const e of ctx.events) {
      if (e.type !== 'LOGIN_FAILURE' && e.type !== 'LOGIN_SUCCESS') continue;
      const actor = e.actorEmail ?? 'unknown';
      const arr = byActor.get(actor) ?? [];
      arr.push(e);
      byActor.set(actor, arr);
    }

    const results: DetectionResult[] = [];
    for (const [actor, events] of byActor) {
      const sorted = [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
      let failuresBefore = 0;
      let success: DetectorEvent | null = null;
      for (const e of sorted) {
        if (e.type === 'LOGIN_FAILURE') {
          failuresBefore++;
        } else if (e.type === 'LOGIN_SUCCESS' && failuresBefore >= minFailures) {
          success = e;
          break;
        }
      }
      if (!success) continue;

      const totalFailures = sorted.filter((e) => e.type === 'LOGIN_FAILURE').length;
      const contributing = sorted.filter((e) => e.type === 'LOGIN_FAILURE' || e === success);
      results.push({
        detectorKey: KEY,
        severity: severityFor(totalFailures),
        score: Math.min(100, 60 + totalFailures * 3),
        title: `Possible account takeover of ${actor}`,
        explanation: `${actor} had ${failuresBefore} failed logins followed by a successful login within ${ctx.windowMinutes} min — the brute force may have succeeded.`,
        evidence: {
          actor,
          failuresBeforeSuccess: failuresBefore,
          totalFailures,
          succeededAt: success.occurredAt.toISOString(),
        },
        eventIds: contributing.map((e) => e.id),
        dedupeKey: `${KEY}:${actor}`,
      });
    }
    return results;
  },
};
