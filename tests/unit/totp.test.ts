import { describe, it, expect } from 'vitest';
import {
  base32Encode,
  base32Decode,
  generateMfaSecret,
  totpAt,
  verifyTotp,
  otpauthUri,
} from '@/lib/auth/totp';

// RFC 6238 Appendix B test vectors (SHA-1, secret "12345678901234567890",
// truncated to 6 digits).
const RFC_KEY = Buffer.from('12345678901234567890', 'ascii');

describe('totp (RFC 6238 vectors)', () => {
  it('matches the published codes', () => {
    expect(totpAt(RFC_KEY, 59 * 1000)).toBe('287082');
    expect(totpAt(RFC_KEY, 1111111109 * 1000)).toBe('081804');
    expect(totpAt(RFC_KEY, 1234567890 * 1000)).toBe('005924');
  });
});

describe('base32', () => {
  it('round-trips bytes', () => {
    const buf = Buffer.from([0, 1, 2, 250, 255, 128, 64]);
    expect(base32Decode(base32Encode(buf))).toEqual(buf);
  });
});

describe('verifyTotp', () => {
  const secret = generateMfaSecret();

  it('accepts the current code', () => {
    const now = Date.now();
    const code = totpAt(base32Decode(secret), now);
    expect(verifyTotp(secret, code, now)).toBe(true);
  });

  it('accepts a code from the previous step (clock drift)', () => {
    const now = Date.now();
    const prev = totpAt(base32Decode(secret), now - 30_000);
    expect(verifyTotp(secret, prev, now)).toBe(true);
  });

  it('rejects a wrong or malformed code', () => {
    expect(verifyTotp(secret, '000000', Date.now() + 600_000)).toBe(false);
    expect(verifyTotp(secret, 'abc', Date.now())).toBe(false);
  });
});

describe('otpauthUri', () => {
  it('encodes issuer, label, and secret', () => {
    const uri = otpauthUri('JBSWY3DPEHPK3PXP', 'a@b.test');
    expect(uri.startsWith('otpauth://totp/SecureFlow:a%40b.test?')).toBe(true);
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(uri).toContain('issuer=SecureFlow');
  });
});
