import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** A signing secret shown once at endpoint creation. */
export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString('base64url')}`;
}

/** HMAC-SHA256 over `${timestamp}.${body}` (Stripe-style), hex-encoded. */
export function computeSignature(secret: string, timestamp: number, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

/** The `X-SecureFlow-Signature` header value: `t=<unix>,v1=<hex>`. */
export function signatureHeader(secret: string, timestamp: number, body: string): string {
  return `t=${timestamp},v1=${computeSignature(secret, timestamp, body)}`;
}

/**
 * Verify a signature header (the check a receiver performs). Rejects tampered
 * bodies, wrong secrets, malformed headers, and stale timestamps (replay).
 */
export function verifySignature(
  secret: string,
  header: string,
  body: string,
  opts: { toleranceSec?: number; nowSec?: number } = {},
): boolean {
  const toleranceSec = opts.toleranceSec ?? 300;
  const nowSec = opts.nowSec ?? Math.floor(Date.now() / 1000);

  const parts: Record<string, string> = {};
  for (const kv of header.split(',')) {
    const [k, v] = kv.split('=');
    if (k && v !== undefined) parts[k.trim()] = v.trim();
  }
  const t = Number(parts.t);
  const v1 = parts.v1;
  if (!Number.isFinite(t) || !v1) return false;
  if (Math.abs(nowSec - t) > toleranceSec) return false;

  const expected = computeSignature(secret, t, body);
  const a = Buffer.from(v1, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
