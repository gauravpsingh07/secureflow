import { test, expect } from '@playwright/test';

// End-to-end: a new workspace mints a key, ingests a brute-force burst through
// the API, triggers detection, and sees the resulting alert in the console.
test('ingest a burst and see an alert fire', async ({ page, request }) => {
  const stamp = Date.now();
  const email = `owner-${stamp}@e2e.test`;

  // 1. Create a workspace (signs in as OWNER, lands on the dashboard).
  await page.goto('/sign-up');
  await page.locator('input[name="organizationName"]').fill(`E2E ${stamp}`);
  await page.locator('input[name="name"]').fill('E2E Owner');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill('password123');
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Security overview' })).toBeVisible();

  // 2. Mint an ingestion key and capture the one-time raw value.
  await page.goto('/settings/api-keys');
  await page.locator('input[name="name"]').fill('e2e key');
  await page.getByRole('button', { name: 'Create key' }).click();
  const rawKey = (await page.locator('code.select-all').innerText()).trim();
  expect(rawKey.startsWith('sf_')).toBeTruthy();

  // 3. Ingest a brute-force burst against one account.
  const events = Array.from({ length: 12 }, () => ({
    type: 'LOGIN_FAILURE',
    actorEmail: `victim-${stamp}@e2e.test`,
    ip: '203.0.113.200',
  }));
  const res = await request.post('/api/v1/events', {
    headers: { 'X-API-Key': rawKey },
    data: { events },
  });
  expect(res.status()).toBe(201);

  // 4. Trigger detection in-process and confirm the alert appears.
  await page.goto('/alerts');
  await page.getByRole('button', { name: 'Run detection now' }).click();
  await expect(page.getByText('Failed-login spike').first()).toBeVisible({ timeout: 15_000 });
});
