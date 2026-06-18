import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, __resetRateLimits } from '@/lib/ratelimit/tokenBucket';

beforeEach(() => __resetRateLimits());

describe('rateLimit', () => {
  it('allows up to the limit, then blocks with a retry hint', () => {
    const key = 'ingest:k1';
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5).allowed).toBe(true);
    }
    const blocked = rateLimit(key, 5);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it('keeps separate buckets per key', () => {
    expect(rateLimit('a', 1).allowed).toBe(true);
    expect(rateLimit('b', 1).allowed).toBe(true);
    expect(rateLimit('a', 1).allowed).toBe(false);
  });
});
