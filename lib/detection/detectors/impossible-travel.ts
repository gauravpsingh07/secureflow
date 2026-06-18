import type { Detector, DetectionContext, DetectionResult, DetectorEvent, Severity } from '../types';
import { haversineKm } from '../geo';

const KEY = 'impossible-travel';
const MIN_DISTANCE_KM = 500;
const MAX_SPEED_KMH = 900; // faster than a commercial flight ⇒ not the same traveller
const CRITICAL_SPEED_KMH = 2000;

type Located = DetectorEvent & { latitude: number; longitude: number };

function hasGeo(e: DetectorEvent): e is Located {
  return e.type === 'LOGIN_SUCCESS' && e.latitude != null && e.longitude != null;
}

function severityFor(speed: number): Severity {
  return speed >= CRITICAL_SPEED_KMH ? 'critical' : 'high';
}

/**
 * Flags two successful logins for the same account that are too far apart to be
 * the same person travelling in the elapsed time. Considers baseline logins too,
 * so travel spanning the window boundary is caught — but only fires when the
 * later login falls inside the window.
 */
export const impossibleTravel: Detector = {
  key: KEY,
  label: 'Impossible travel',
  run(ctx: DetectionContext): DetectionResult[] {
    const byActor = new Map<string, Located[]>();
    for (const e of [...ctx.baseline, ...ctx.events]) {
      if (!hasGeo(e)) continue;
      const actor = e.actorEmail ?? 'unknown';
      const arr = byActor.get(actor) ?? [];
      arr.push(e);
      byActor.set(actor, arr);
    }

    const results: DetectionResult[] = [];
    for (const [actor, logins] of byActor) {
      logins.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
      for (let i = 1; i < logins.length; i++) {
        const a = logins[i - 1];
        const b = logins[i];
        if (b.occurredAt < ctx.windowStart) continue; // only flag new travel

        const distance = haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
        const hours = (b.occurredAt.getTime() - a.occurredAt.getTime()) / 3_600_000;
        if (distance < MIN_DISTANCE_KM || hours <= 0) continue;
        const speed = distance / hours;
        if (speed <= MAX_SPEED_KMH) continue;

        const from = [a.city, a.country].filter(Boolean).join(', ') || 'unknown';
        const to = [b.city, b.country].filter(Boolean).join(', ') || 'unknown';
        results.push({
          detectorKey: KEY,
          severity: severityFor(speed),
          score: Math.min(100, Math.round((speed / CRITICAL_SPEED_KMH) * 100)),
          title: `Impossible travel for ${actor}`,
          explanation: `${actor} logged in from ${from} then ${to} — ${Math.round(distance)} km in ${
            Math.round(hours * 100) / 100
          } h (${Math.round(speed)} km/h).`,
          evidence: {
            actor,
            from,
            to,
            distanceKm: Math.round(distance),
            hours: Math.round(hours * 100) / 100,
            impliedSpeedKmh: Math.round(speed),
          },
          eventIds: [a.id, b.id],
          dedupeKey: `${KEY}:${actor}:${b.id}`,
        });
      }
    }
    return results;
  },
};
