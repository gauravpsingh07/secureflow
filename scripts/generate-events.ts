/**
 * Synthetic event generator. Posts a believable week of security telemetry —
 * normal logins plus a brute-force burst and an impossible-travel login — to the
 * ingestion API, so the detection engine (Phase 3) has something real to find.
 *
 *   SECUREFLOW_API_KEY=sf_xxx pnpm generate:events
 *   # or: pnpm generate:events sf_xxx
 */

type EventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'PASSWORD_RESET'
  | 'MFA_CHALLENGE'
  | 'API_REQUEST'
  | 'PERMISSION_CHANGE';

type Ev = {
  type: EventType;
  actorEmail?: string;
  ip?: string;
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  userAgent?: string;
  success?: boolean;
  occurredAt?: string;
  raw?: Record<string, unknown>;
};

const BASE_URL = process.env.SECUREFLOW_URL ?? 'http://localhost:3000';
const API_KEY = process.env.SECUREFLOW_API_KEY ?? process.argv[2];

if (!API_KEY) {
  console.error('Missing API key. Set SECUREFLOW_API_KEY or pass it as the first argument.');
  process.exit(1);
}

const GEOS = {
  ny: { country: 'US', city: 'New York', latitude: 40.71, longitude: -74.0 },
  sf: { country: 'US', city: 'San Francisco', latitude: 37.77, longitude: -122.42 },
  ldn: { country: 'GB', city: 'London', latitude: 51.5, longitude: -0.12 },
  ber: { country: 'DE', city: 'Berlin', latitude: 52.52, longitude: 13.4 },
  sg: { country: 'SG', city: 'Singapore', latitude: 1.35, longitude: 103.81 },
} as const;

const AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/124.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) Firefox/126.0',
];

const USERS = [
  { email: 'alice@northwind.test', home: GEOS.ny, ip: '198.51.100.21' },
  { email: 'bob@northwind.test', home: GEOS.sf, ip: '198.51.100.42' },
  { email: 'carol@northwind.test', home: GEOS.ldn, ip: '203.0.113.10' },
  { email: 'dave@northwind.test', home: GEOS.ber, ip: '203.0.113.55' },
] as const;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function choice<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function iso(ms: number): string {
  return new Date(ms).toISOString();
}

/** A week of ordinary logins, the occasional typo, logout and API traffic. */
function baselineTraffic(now: number): Ev[] {
  const events: Ev[] = [];
  for (let day = 7; day >= 1; day--) {
    for (const user of USERS) {
      const logins = randInt(1, 3);
      for (let i = 0; i < logins; i++) {
        const at = now - day * DAY + randInt(8, 18) * HOUR + randInt(0, 59) * MINUTE;
        const agent = choice(AGENTS);
        if (Math.random() < 0.15) {
          events.push({
            type: 'LOGIN_FAILURE',
            actorEmail: user.email,
            ip: user.ip,
            ...user.home,
            userAgent: agent,
            occurredAt: iso(at),
          });
        }
        events.push({
          type: 'LOGIN_SUCCESS',
          actorEmail: user.email,
          ip: user.ip,
          ...user.home,
          userAgent: agent,
          occurredAt: iso(at + MINUTE),
        });
        for (let r = 0; r < randInt(1, 4); r++) {
          events.push({
            type: 'API_REQUEST',
            actorEmail: user.email,
            ip: user.ip,
            ...user.home,
            occurredAt: iso(at + (r + 2) * MINUTE),
          });
        }
        events.push({
          type: 'LOGOUT',
          actorEmail: user.email,
          ip: user.ip,
          ...user.home,
          occurredAt: iso(at + randInt(20, 90) * MINUTE),
        });
      }
    }
  }
  return events;
}

/** A credential-stuffing burst against one account from a hostile IP. */
function bruteForceBurst(now: number): Ev[] {
  const events: Ev[] = [];
  const start = now - 10 * MINUTE; // inside the detection window so it fires
  const target = 'carol@northwind.test';
  const hostileIp = '203.0.113.66';
  for (let i = 0; i < 28; i++) {
    events.push({
      type: 'LOGIN_FAILURE',
      actorEmail: target,
      ip: hostileIp,
      ...GEOS.sg,
      userAgent: 'python-requests/2.31',
      occurredAt: iso(start + i * randInt(2, 6) * 1000),
      raw: { scenario: 'brute-force' },
    });
  }
  return events;
}

/** Two successful logins too far apart to be the same traveller. */
function impossibleTravel(now: number): Ev[] {
  const at = now - 12 * MINUTE; // inside the detection window
  return [
    {
      type: 'LOGIN_SUCCESS',
      actorEmail: 'bob@northwind.test',
      ip: '198.51.100.42',
      ...GEOS.ny,
      userAgent: choice(AGENTS),
      occurredAt: iso(at),
      raw: { scenario: 'impossible-travel' },
    },
    {
      type: 'LOGIN_SUCCESS',
      actorEmail: 'bob@northwind.test',
      ip: '45.61.122.9',
      ...GEOS.sg,
      userAgent: choice(AGENTS),
      occurredAt: iso(at + 10 * MINUTE),
      raw: { scenario: 'impossible-travel' },
    },
  ];
}

async function postBatch(events: Ev[]): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/v1/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY as string },
    body: JSON.stringify({ events }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ingest failed (${res.status}): ${text}`);
  }
}

async function main(): Promise<void> {
  const now = Date.now();
  const all = [...baselineTraffic(now), ...bruteForceBurst(now), ...impossibleTravel(now)].sort(
    (a, b) => (a.occurredAt ?? '').localeCompare(b.occurredAt ?? ''),
  );

  console.log(`Posting ${all.length} events to ${BASE_URL} …`);
  const CHUNK = 200;
  for (let i = 0; i < all.length; i += CHUNK) {
    await postBatch(all.slice(i, i + CHUNK));
    process.stdout.write('.');
  }
  console.log(`\nDone. Ingested ${all.length} events (incl. a brute-force burst and an impossible-travel login).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
