import type { DetectorEvent, DetectionContext } from './types';

// A small labeled dataset: each scenario lists the detector keys that *should*
// fire. Negative scenarios expect none, which exercises false-positive rate.

const NOW = new Date('2026-06-18T12:00:00.000Z');
const WINDOW = 15;
const WS = new Date(NOW.getTime() - WINDOW * 60_000);
const MIN = 60_000;
const DAY = 86_400_000;

let counter = 0;
function ev(p: Partial<DetectorEvent> & { type: DetectorEvent['type'] }): DetectorEvent {
  return {
    id: `ev${counter++}`,
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

function steadyBaseline(actor: string): DetectorEvent[] {
  const out: DetectorEvent[] = [];
  for (let i = 1; i <= 40; i++) {
    const at = new Date(WS.getTime() - i * WINDOW * MIN);
    const n = i % 4 === 0 ? 2 : 1;
    for (let j = 0; j < n; j++) out.push(ev({ type: 'LOGIN_SUCCESS', actorEmail: actor, ip: '10.0.0.1', occurredAt: at }));
  }
  return out;
}

export type EvalScenario = { name: string; context: DetectionContext; expected: string[] };

export const evalScenarios: EvalScenario[] = [
  {
    name: 'single-account brute force',
    context: ctx(Array.from({ length: 12 }, () => ev({ type: 'LOGIN_FAILURE', actorEmail: 'carol@x', ip: '203.0.113.66' }))),
    expected: ['failed-login-spike'],
  },
  {
    name: 'credential stuffing',
    context: ctx(
      ['a@x', 'b@x', 'c@x', 'd@x', 'e@x', 'f@x', 'g@x'].map((e) =>
        ev({ type: 'LOGIN_FAILURE', actorEmail: e, ip: '198.18.0.7' }),
      ),
    ),
    expected: ['credential-stuffing'],
  },
  {
    name: 'impossible travel',
    context: ctx([
      ev({ type: 'LOGIN_SUCCESS', actorEmail: 'bob@x', latitude: 40.71, longitude: -74, city: 'New York', country: 'US', occurredAt: new Date(NOW.getTime() - 10 * MIN) }),
      ev({ type: 'LOGIN_SUCCESS', actorEmail: 'bob@x', latitude: 1.35, longitude: 103.81, city: 'Singapore', country: 'SG', occurredAt: NOW }),
    ]),
    expected: ['impossible-travel'],
  },
  {
    name: 'new IP for known account',
    context: ctx(
      [ev({ type: 'LOGIN_SUCCESS', actorEmail: 'dave@x', ip: '45.61.122.9', city: 'Berlin', country: 'DE' })],
      [ev({ type: 'LOGIN_SUCCESS', actorEmail: 'dave@x', ip: '203.0.113.55', occurredAt: new Date(NOW.getTime() - DAY) })],
    ),
    expected: ['new-device-ip'],
  },
  {
    name: 'anomalous login rate',
    context: ctx(
      Array.from({ length: 10 }, () => ev({ type: 'LOGIN_SUCCESS', actorEmail: 'alice@x', ip: '10.0.0.1' })),
      steadyBaseline('alice@x'),
    ),
    expected: ['anomalous-login-rate'],
  },
  {
    name: 'normal activity (negative)',
    context: ctx(
      [ev({ type: 'LOGIN_SUCCESS', actorEmail: 'alice@x', ip: '10.0.0.1' }), ev({ type: 'LOGOUT', actorEmail: 'alice@x', ip: '10.0.0.1' })],
      steadyBaseline('alice@x'),
    ),
    expected: [],
  },
  {
    name: 'a couple of failures (negative)',
    context: ctx(Array.from({ length: 3 }, () => ev({ type: 'LOGIN_FAILURE', actorEmail: 'alice@x', ip: '10.0.0.1' }))),
    expected: [],
  },
  {
    name: 'account takeover (failures then success)',
    context: ctx([
      ...Array.from({ length: 6 }, () =>
        ev({ type: 'LOGIN_FAILURE', actorEmail: 'erin@x', ip: '203.0.113.99', occurredAt: new Date(NOW.getTime() - 5 * MIN) }),
      ),
      ev({ type: 'LOGIN_SUCCESS', actorEmail: 'erin@x', ip: '203.0.113.99', occurredAt: NOW }),
    ]),
    expected: ['account-takeover'],
  },
  {
    name: 'privilege escalation (rapid permission changes)',
    context: ctx(Array.from({ length: 4 }, () => ev({ type: 'PERMISSION_CHANGE', actorEmail: 'frank@x' }))),
    expected: ['privilege-escalation'],
  },
];
