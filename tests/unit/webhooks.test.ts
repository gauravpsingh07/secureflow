import { describe, it, expect } from 'vitest';
import {
  computeSignature,
  signatureHeader,
  verifySignature,
  generateWebhookSecret,
} from '@/lib/webhooks/sign';
import { planNextAttempt, MAX_ATTEMPTS } from '@/lib/webhooks/retry';

describe('webhook signing', () => {
  const secret = 'whsec_test';
  const body = JSON.stringify({ id: 'd1', type: 'alert.created' });
  const ts = 1_700_000_000;

  it('is deterministic and prefixed', () => {
    expect(computeSignature(secret, ts, body)).toBe(computeSignature(secret, ts, body));
    expect(signatureHeader(secret, ts, body)).toMatch(/^t=1700000000,v1=[0-9a-f]{64}$/);
  });

  it('verifies a valid signature within tolerance', () => {
    const header = signatureHeader(secret, ts, body);
    expect(verifySignature(secret, header, body, { nowSec: ts + 10 })).toBe(true);
  });

  it('rejects tampering, wrong secret, staleness, and malformed headers', () => {
    const header = signatureHeader(secret, ts, body);
    expect(verifySignature(secret, header, body + 'x', { nowSec: ts })).toBe(false);
    expect(verifySignature('other', header, body, { nowSec: ts })).toBe(false);
    expect(verifySignature(secret, header, body, { nowSec: ts + 10_000 })).toBe(false);
    expect(verifySignature(secret, 'garbage', body, { nowSec: ts })).toBe(false);
  });

  it('generates unique prefixed secrets', () => {
    expect(generateWebhookSecret()).toMatch(/^whsec_/);
    expect(generateWebhookSecret()).not.toBe(generateWebhookSecret());
  });
});

describe('webhook retry planning', () => {
  it('marks success terminal', () => {
    expect(planNextAttempt(0, true)).toEqual({ status: 'SUCCESS', attempts: 1, nextAttemptInSeconds: null });
  });

  it('schedules a backoff after a failure', () => {
    const plan = planNextAttempt(0, false);
    expect(plan.status).toBe('PENDING');
    expect(plan.attempts).toBe(1);
    expect(plan.nextAttemptInSeconds).toBe(60);
  });

  it('gives up after the max attempts', () => {
    const plan = planNextAttempt(MAX_ATTEMPTS - 1, false);
    expect(plan.status).toBe('FAILED');
    expect(plan.nextAttemptInSeconds).toBeNull();
  });
});
