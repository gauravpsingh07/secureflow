import { describe, it, expect } from 'vitest';
import { scan } from '@/lib/scanner/rules';
import { shannonEntropy } from '@/lib/scanner/entropy';
import { maskSecret } from '@/lib/scanner/scan';

function ruleIds(text: string): string[] {
  return scan(text).map((f) => f.ruleId);
}

describe('shannonEntropy', () => {
  it('is higher for random strings than for repetition', () => {
    expect(shannonEntropy('8f2a9c1d4e6b7a3f')).toBeGreaterThan(shannonEntropy('aaaaaaaaaaaaaaaa'));
    expect(shannonEntropy('')).toBe(0);
  });
});

describe('maskSecret', () => {
  it('never returns the full secret', () => {
    expect(maskSecret('AKIAIOSFODNN7EXAMPLE')).not.toContain('IOSFODNN7');
  });
});

describe('scan — true positives', () => {
  it('AWS access key id', () => {
    expect(ruleIds('id = AKIAIOSFODNN7EXAMPLE')).toContain('aws-access-key-id');
  });
  it('GitHub PAT', () => {
    expect(ruleIds(`token: ghp_${'a'.repeat(36)}`)).toContain('github-pat');
  });
  it('Stripe live key is critical', () => {
    const f = scan(`key=sk_live_${'a'.repeat(24)}`).find((x) => x.ruleId === 'stripe-live-secret');
    expect(f?.severity).toBe('critical');
  });
  it('Slack token', () => {
    expect(ruleIds('xoxb-123456789012-abcdef')).toContain('slack-token');
  });
  it('Google API key', () => {
    expect(ruleIds(`AIza${'a'.repeat(35)}`)).toContain('google-api-key');
  });
  it('private key block', () => {
    expect(ruleIds('-----BEGIN RSA PRIVATE KEY-----')).toContain('private-key');
  });
  it('generic high-entropy secret', () => {
    expect(ruleIds('api_key = "8f2a9c1d4e6b7a3f5c0d9e8b2a1f4c7d"')).toContain('generic-secret');
  });
});

describe('scan — false positives', () => {
  it('ignores prose', () => {
    expect(scan('This describes our security and token policy.')).toHaveLength(0);
  });
  it('ignores short secrets', () => {
    expect(scan('password = "short"')).toHaveLength(0);
  });
  it('ignores low-entropy generic values', () => {
    expect(scan('token = "aaaaaaaaaaaaaaaa"')).toHaveLength(0);
  });
});
