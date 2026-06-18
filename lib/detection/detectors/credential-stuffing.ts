import type { Detector, DetectionContext, DetectionResult, DetectorEvent, Severity } from '../types';
import { param } from '../config';

const KEY = 'credential-stuffing';
const MIN_ACCOUNTS = 5; // distinct accounts targeted from one IP within the window (tunable)
const CRITICAL_ACCOUNTS = 15;

function severityFor(accounts: number): Severity {
  return accounts >= CRITICAL_ACCOUNTS ? 'critical' : 'high';
}

/**
 * Flags one source IP attempting to log into many different accounts — the
 * credential-stuffing / password-spray signature (complements the single-account
 * failed-login spike detector).
 */
export const credentialStuffing: Detector = {
  key: KEY,
  label: 'Credential stuffing',
  run(ctx: DetectionContext): DetectionResult[] {
    const byIp = new Map<string, DetectorEvent[]>();
    for (const e of ctx.events) {
      if (e.type !== 'LOGIN_FAILURE' || !e.ip) continue;
      const arr = byIp.get(e.ip) ?? [];
      arr.push(e);
      byIp.set(e.ip, arr);
    }

    const minAccounts = param(ctx, KEY, 'minAccounts', MIN_ACCOUNTS);
    const results: DetectionResult[] = [];
    for (const [ip, failures] of byIp) {
      const accounts = new Set(failures.map((f) => f.actorEmail ?? 'unknown'));
      if (accounts.size < minAccounts) continue;
      results.push({
        detectorKey: KEY,
        severity: severityFor(accounts.size),
        score: Math.min(100, Math.round((accounts.size / CRITICAL_ACCOUNTS) * 100)),
        title: `Credential stuffing from ${ip}`,
        explanation: `${ip} attempted ${failures.length} failed logins across ${accounts.size} distinct accounts within ${ctx.windowMinutes} min.`,
        evidence: {
          ip,
          distinctAccounts: accounts.size,
          totalAttempts: failures.length,
          windowMinutes: ctx.windowMinutes,
        },
        eventIds: failures.map((f) => f.id),
        dedupeKey: `${KEY}:${ip}`,
      });
    }
    return results;
  },
};
