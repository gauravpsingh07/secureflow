import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/db/client';
import { generateApiKey } from '../lib/apikey';
import { runDetection } from '../lib/detection/run';
import { scan } from '../lib/scanner/rules';
import { audit } from '../lib/audit';
import type { Prisma } from '../lib/generated/prisma/client';
import type { SecurityEventType } from '../lib/generated/prisma/enums';

const SLUG = 'northwind';
const PASSWORD = 'demodemo';
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const GEOS = {
  ny: { country: 'US', city: 'New York', latitude: 40.71, longitude: -74.0 },
  sf: { country: 'US', city: 'San Francisco', latitude: 37.77, longitude: -122.42 },
  ldn: { country: 'GB', city: 'London', latitude: 51.5, longitude: -0.12 },
  ber: { country: 'DE', city: 'Berlin', latitude: 52.52, longitude: 13.4 },
  sg: { country: 'SG', city: 'Singapore', latitude: 1.35, longitude: 103.81 },
};

const USERS = [
  { email: 'alice@northwind.test', home: GEOS.ny, ip: '198.51.100.21' },
  { email: 'bob@northwind.test', home: GEOS.sf, ip: '198.51.100.42' },
  { email: 'carol@northwind.test', home: GEOS.ldn, ip: '203.0.113.10' },
  { email: 'dave@northwind.test', home: GEOS.ber, ip: '203.0.113.55' },
];

const AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/124.0 Safari/537.36';

type EventRow = Omit<Prisma.SecurityEventCreateManyInput, 'tenantId'>;

function ev(type: SecurityEventType, at: number, extra: Partial<EventRow> = {}): EventRow {
  return { type, occurredAt: new Date(at), success: type !== 'LOGIN_FAILURE', ...extra };
}

function buildEvents(now: number): EventRow[] {
  const events: EventRow[] = [];

  // A week of ordinary baseline traffic from home locations.
  for (let day = 7; day >= 1; day--) {
    for (const u of USERS) {
      const at = now - day * DAY + 9 * HOUR;
      events.push(ev('LOGIN_SUCCESS', at, { actorEmail: u.email, ip: u.ip, ...u.home, userAgent: AGENT }));
      events.push(ev('API_REQUEST', at + 5 * MIN, { actorEmail: u.email, ip: u.ip, ...u.home }));
      events.push(ev('LOGOUT', at + HOUR, { actorEmail: u.email, ip: u.ip, ...u.home }));
    }
  }

  // Recent incidents — placed inside the detection window so they fire on seed.
  // 1) Brute force against one account.
  for (let i = 0; i < 28; i++) {
    events.push(
      ev('LOGIN_FAILURE', now - 10 * MIN + i * 12_000, {
        actorEmail: 'carol@northwind.test',
        ip: '203.0.113.66',
        ...GEOS.sg,
        userAgent: 'python-requests/2.31',
        raw: { scenario: 'brute-force' } as Prisma.InputJsonValue,
      }),
    );
  }
  // 2) Impossible travel for bob (NY then Singapore minutes apart).
  events.push(ev('LOGIN_SUCCESS', now - 12 * MIN, { actorEmail: 'bob@northwind.test', ip: '198.51.100.42', ...GEOS.ny, userAgent: AGENT }));
  events.push(ev('LOGIN_SUCCESS', now - 2 * MIN, { actorEmail: 'bob@northwind.test', ip: '45.61.122.9', ...GEOS.sg, userAgent: AGENT, raw: { scenario: 'impossible-travel' } as Prisma.InputJsonValue }));
  // 3) Credential stuffing — one IP, many accounts.
  ['amy', 'ben', 'cleo', 'dan', 'eve', 'finn', 'gail'].forEach((name, i) => {
    events.push(ev('LOGIN_FAILURE', now - 8 * MIN + i * 20_000, { actorEmail: `${name}@northwind.test`, ip: '198.18.0.7', ...GEOS.ber }));
  });

  return events;
}

async function main(): Promise<void> {
  await prisma.tenant.deleteMany({ where: { slug: SLUG } });
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Northwind Security',
      slug: SLUG,
      users: {
        create: [
          { name: 'Olivia Owner', email: 'owner@northwind.test', passwordHash, role: 'OWNER' },
          { name: 'Adam Admin', email: 'admin@northwind.test', passwordHash, role: 'ADMIN' },
          { name: 'Ana Analyst', email: 'analyst@northwind.test', passwordHash, role: 'ANALYST' },
          { name: 'Vic Viewer', email: 'viewer@northwind.test', passwordHash, role: 'VIEWER' },
        ],
      },
    },
  });

  const { hashed, prefix } = generateApiKey();
  await prisma.apiKey.create({
    data: { tenantId: tenant.id, name: 'Demo ingestion', hashedKey: hashed, prefix },
  });

  const now = Date.now();
  const events = buildEvents(now).map((e) => ({ ...e, tenantId: tenant.id }));
  await prisma.securityEvent.createMany({ data: events });

  // Generate alerts from the events.
  const summary = await runDetection(tenant.id);

  // Make the workflow look lived-in: acknowledge one alert.
  const open = await prisma.alert.findFirst({ where: { tenantId: tenant.id }, orderBy: { severity: 'asc' } });
  if (open) await prisma.alert.update({ where: { id: open.id }, data: { status: 'ACKNOWLEDGED' } });

  // A secret scan with planted findings.
  const sample = [
    '# leaked config (demo)',
    'aws_access_key_id = AKIAIOSFODNN7EXAMPLE',
    `STRIPE_SECRET=sk_live_${'a'.repeat(24)}`,
    'api_key = "8f2a9c1d4e6b7a3f5c0d9e8b2a1f4c7d"',
  ].join('\n');
  const findings = scan(sample);
  await prisma.secretScan.create({
    data: {
      tenantId: tenant.id,
      source: 'committed config (demo)',
      bytesScanned: sample.length,
      findingCount: findings.length,
      findings: {
        create: findings.map((f) => ({
          ruleId: f.ruleId,
          ruleName: f.ruleName,
          severity: f.severity.toUpperCase() as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
          line: f.line,
          column: f.column,
          maskedValue: f.match,
          remediation: f.remediation,
        })),
      },
    },
  });

  await audit({ tenantId: tenant.id, actorName: 'Olivia Owner', action: 'tenant.create', target: SLUG });
  await audit({ tenantId: tenant.id, actorName: 'Adam Admin', action: 'apikey.create', target: prefix });

  console.log(
    `Seeded "${tenant.name}": ${events.length} events, ${summary.findings} alerts, ${findings.length} scan findings.`,
  );
  console.log('Sign in: owner@northwind.test / demodemo (also admin@/analyst@/viewer@).');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
