import { createHmac, randomBytes } from 'node:crypto';

// RFC 6238 TOTP (SHA-1, 6 digits, 30s step) with RFC 4648 base32 secrets.
// Implemented on node:crypto so there's no external dependency.

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** A fresh 160-bit base32 secret for a new enrollment. */
export function generateMfaSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(key: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (bin % 10 ** DIGITS).toString().padStart(DIGITS, '0');
}

/** The TOTP code for raw key bytes at a given time (used for testing against RFC vectors). */
export function totpAt(key: Buffer, timeMs: number): string {
  return hotp(key, Math.floor(timeMs / 1000 / STEP_SECONDS));
}

/** Verify a 6-digit code against a base32 secret, allowing ±1 step for clock drift. */
export function verifyTotp(secretBase32: string, token: string, nowMs: number = Date.now()): boolean {
  const code = token.replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) return false;
  const key = base32Decode(secretBase32);
  const step = Math.floor(nowMs / 1000 / STEP_SECONDS);
  for (let w = -1; w <= 1; w++) {
    if (hotp(key, step + w) === code) return true;
  }
  return false;
}

/** otpauth:// URI for authenticator apps (also shown as the manual-entry key). */
export function otpauthUri(secretBase32: string, email: string, issuer = 'SecureFlow'): string {
  // Keep the issuer:account colon literal (the conventional otpauth label format).
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(email)}`;
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
