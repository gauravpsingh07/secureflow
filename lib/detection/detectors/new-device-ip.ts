import type { Detector, DetectionContext, DetectionResult } from '../types';

const KEY = 'new-device-ip';

/**
 * Flags a successful login from an IP a known account has never used before
 * (optionally also a new device). New accounts with no history are skipped to
 * avoid flagging every first-ever login.
 */
export const newDeviceIp: Detector = {
  key: KEY,
  label: 'New device / IP',
  run(ctx: DetectionContext): DetectionResult[] {
    const baseIps = new Map<string, Set<string>>();
    const baseAgents = new Map<string, Set<string>>();
    for (const e of ctx.baseline) {
      if (e.type !== 'LOGIN_SUCCESS') continue;
      const actor = e.actorEmail ?? 'unknown';
      if (e.ip) (baseIps.get(actor) ?? setIn(baseIps, actor)).add(e.ip);
      if (e.userAgent) (baseAgents.get(actor) ?? setIn(baseAgents, actor)).add(e.userAgent);
    }

    const results: DetectionResult[] = [];
    const seen = new Set<string>();
    for (const e of ctx.events) {
      if (e.type !== 'LOGIN_SUCCESS' || !e.ip) continue;
      const actor = e.actorEmail ?? 'unknown';
      const knownIps = baseIps.get(actor);
      if (!knownIps || knownIps.has(e.ip)) continue; // unknown actor, or known IP

      const dedupe = `${actor}:${e.ip}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);

      const newDevice = e.userAgent ? !baseAgents.get(actor)?.has(e.userAgent) : false;
      const loc = [e.city, e.country].filter(Boolean).join(', ') || 'unknown';
      results.push({
        detectorKey: KEY,
        severity: newDevice ? 'medium' : 'low',
        score: newDevice ? 45 : 30,
        title: `New ${newDevice ? 'device and location' : 'location'} for ${actor}`,
        explanation: `${actor} signed in from a new IP ${e.ip} (${loc})${
          newDevice ? ' on an unrecognized device' : ''
        }.`,
        evidence: { actor, ip: e.ip, location: loc, newDevice, userAgent: e.userAgent },
        eventIds: [e.id],
        dedupeKey: `${KEY}:${actor}:${e.ip}`,
      });
    }
    return results;
  },
};

function setIn(map: Map<string, Set<string>>, key: string): Set<string> {
  const s = new Set<string>();
  map.set(key, s);
  return s;
}
