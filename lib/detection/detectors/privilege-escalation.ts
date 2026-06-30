import type { Detector, DetectionContext, DetectionResult, DetectorEvent, Severity } from '../types';
import { param } from '../config';

const KEY = 'privilege-escalation';
const MIN_CHANGES = 3; // permission changes by one actor within the window (tunable)

function severityFor(count: number): Severity {
  if (count >= 8) return 'critical';
  if (count >= 5) return 'high';
  return 'medium';
}

/**
 * Flags an actor making an unusual number of permission changes in a short
 * window — the signature of someone (or a compromised account) rapidly granting
 * access. Surfaces the otherwise-quiet `PERMISSION_CHANGE` event stream.
 */
export const privilegeEscalation: Detector = {
  key: KEY,
  label: 'Privilege escalation',
  run(ctx: DetectionContext): DetectionResult[] {
    const minChanges = param(ctx, KEY, 'minChanges', MIN_CHANGES);

    const byActor = new Map<string, DetectorEvent[]>();
    for (const e of ctx.events) {
      if (e.type !== 'PERMISSION_CHANGE') continue;
      const actor = e.actorEmail ?? 'unknown';
      const arr = byActor.get(actor) ?? [];
      arr.push(e);
      byActor.set(actor, arr);
    }

    const results: DetectionResult[] = [];
    for (const [actor, changes] of byActor) {
      if (changes.length < minChanges) continue;
      results.push({
        detectorKey: KEY,
        severity: severityFor(changes.length),
        score: Math.min(100, Math.round((changes.length / 8) * 100)),
        title: `Rapid permission changes by ${actor}`,
        explanation: `${actor} made ${changes.length} permission changes within ${ctx.windowMinutes} min (threshold ${minChanges}) — review for unauthorized privilege escalation.`,
        evidence: {
          actor,
          changes: changes.length,
          windowMinutes: ctx.windowMinutes,
          threshold: minChanges,
        },
        eventIds: changes.map((e) => e.id),
        dedupeKey: `${KEY}:${actor}`,
      });
    }
    return results;
  },
};
