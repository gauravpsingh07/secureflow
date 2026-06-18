import { describe, it, expect } from 'vitest';
import type { DetectorEvent, DetectionContext } from '@/lib/detection/types';
import { failedLoginSpike } from '@/lib/detection/detectors/failed-login-spike';
import { anomalousLoginRate } from '@/lib/detection/detectors/anomalous-login-rate';
import { impossibleTravel } from '@/lib/detection/detectors/impossible-travel';
import { newDeviceIp } from '@/lib/detection/detectors/new-device-ip';
import { credentialStuffing } from '@/lib/detection/detectors/credential-stuffing';

const NOW = new Date('2026-06-18T12:00:00.000Z');
const WINDOW = 15;
const WS = new Date(NOW.getTime() - WINDOW * 60_000);
const MIN = 60_000;
const DAY = 86_400_000;

let counter = 0;
function ev(p: Partial<DetectorEvent> & { type: DetectorEvent['type'] }): DetectorEvent {
  return {
    id: `e${counter++}`,
    type: p.type,
    actorEmail: p.actorEmail ?? null,
    ip: p.ip ?? null,
    country: p.country ?? null,
    city: p.city ?? null,
    latitude: p.latitude ?? null,
    longitude: p.longitude ?? null,
    userAgent: p.userAgent ?? null,
    success: p.success ?? p.type !== 'LOGIN_FAILURE',
    occurredAt: p.occurredAt ?? NOW,
  };
}

function ctx(events: DetectorEvent[], baseline: DetectorEvent[] = []): DetectionContext {
  return { tenantId: 't', now: NOW, windowStart: WS, windowMinutes: WINDOW, events, baseline };
}

describe('failedLoginSpike', () => {
  it('fires when failures exceed the threshold for one actor', () => {
    const events = Array.from({ length: 10 }, () =>
      ev({ type: 'LOGIN_FAILURE', actorEmail: 'a@x', ip: '1.1.1.1' }),
    );
    const res = failedLoginSpike.run(ctx(events));
    expect(res).toHaveLength(1);
    expect(res[0].dedupeKey).toBe('failed-login-spike:a@x');
    expect(res[0].severity).toBe('medium');
  });

  it('stays quiet below the threshold', () => {
    const events = Array.from({ length: 3 }, () => ev({ type: 'LOGIN_FAILURE', actorEmail: 'a@x' }));
    expect(failedLoginSpike.run(ctx(events))).toHaveLength(0);
  });
});

describe('anomalousLoginRate', () => {
  it('flags a window that is a statistical outlier vs the actor baseline', () => {
    const baseline: DetectorEvent[] = [];
    for (let i = 1; i <= 40; i++) {
      const at = new Date(WS.getTime() - i * WINDOW * MIN);
      const n = i % 4 === 0 ? 2 : 1;
      for (let j = 0; j < n; j++) baseline.push(ev({ type: 'LOGIN_SUCCESS', actorEmail: 'a@x', occurredAt: at }));
    }
    const events = Array.from({ length: 10 }, () => ev({ type: 'LOGIN_SUCCESS', actorEmail: 'a@x' }));
    const res = anomalousLoginRate.run(ctx(events, baseline));
    expect(res).toHaveLength(1);
    expect(res[0].evidence.current).toBe(10);
  });

  it('does nothing without a baseline', () => {
    const events = Array.from({ length: 10 }, () => ev({ type: 'LOGIN_SUCCESS', actorEmail: 'a@x' }));
    expect(anomalousLoginRate.run(ctx(events, []))).toHaveLength(0);
  });
});

describe('impossibleTravel', () => {
  it('flags two distant logins too close in time', () => {
    const a = ev({
      type: 'LOGIN_SUCCESS',
      actorEmail: 'b@x',
      latitude: 40.71,
      longitude: -74,
      city: 'New York',
      country: 'US',
      occurredAt: new Date(NOW.getTime() - 10 * MIN),
    });
    const b = ev({
      type: 'LOGIN_SUCCESS',
      actorEmail: 'b@x',
      latitude: 1.35,
      longitude: 103.81,
      city: 'Singapore',
      country: 'SG',
      occurredAt: NOW,
    });
    const res = impossibleTravel.run(ctx([a, b]));
    expect(res).toHaveLength(1);
    expect(Number(res[0].evidence.impliedSpeedKmh)).toBeGreaterThan(900);
  });
});

describe('newDeviceIp', () => {
  it('flags a known account logging in from a never-seen IP', () => {
    const baseline = [
      ev({ type: 'LOGIN_SUCCESS', actorEmail: 'c@x', ip: '9.9.9.9', occurredAt: new Date(NOW.getTime() - DAY) }),
    ];
    const events = [ev({ type: 'LOGIN_SUCCESS', actorEmail: 'c@x', ip: '5.5.5.5', city: 'Berlin', country: 'DE' })];
    expect(newDeviceIp.run(ctx(events, baseline))).toHaveLength(1);
  });

  it('skips brand-new accounts with no history', () => {
    const events = [ev({ type: 'LOGIN_SUCCESS', actorEmail: 'new@x', ip: '7.7.7.7' })];
    expect(newDeviceIp.run(ctx(events, []))).toHaveLength(0);
  });
});

describe('credentialStuffing', () => {
  it('flags one IP spraying many distinct accounts', () => {
    const events = ['a@x', 'b@x', 'c@x', 'd@x', 'e@x', 'f@x'].map((e) =>
      ev({ type: 'LOGIN_FAILURE', actorEmail: e, ip: '6.6.6.6' }),
    );
    const res = credentialStuffing.run(ctx(events));
    expect(res).toHaveLength(1);
    expect(res[0].evidence.distinctAccounts).toBe(6);
  });
});
