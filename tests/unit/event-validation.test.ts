import { describe, it, expect } from 'vitest';
import { ingestEventSchema, ingestPayloadSchema, toEventArray } from '@/lib/validation/event';
import { normalizeEvent } from '@/lib/ingest/normalize';

describe('event validation', () => {
  it('accepts a minimal event', () => {
    expect(ingestEventSchema.safeParse({ type: 'LOGIN_SUCCESS' }).success).toBe(true);
  });

  it('rejects an unknown type', () => {
    expect(ingestEventSchema.safeParse({ type: 'WAT' }).success).toBe(false);
  });

  it('rejects a bad email and out-of-range coordinates', () => {
    expect(ingestEventSchema.safeParse({ type: 'LOGIN_SUCCESS', actorEmail: 'nope' }).success).toBe(
      false,
    );
    expect(ingestEventSchema.safeParse({ type: 'LOGIN_SUCCESS', latitude: 999 }).success).toBe(false);
  });

  it('toEventArray flattens single, array, and { events } shapes', () => {
    expect(toEventArray(ingestPayloadSchema.parse({ type: 'LOGOUT' }))).toHaveLength(1);
    expect(
      toEventArray(ingestPayloadSchema.parse([{ type: 'LOGOUT' }, { type: 'LOGIN_SUCCESS' }])),
    ).toHaveLength(2);
    expect(toEventArray(ingestPayloadSchema.parse({ events: [{ type: 'LOGOUT' }] }))).toHaveLength(1);
  });
});

describe('normalizeEvent', () => {
  it('lowercases email, uppercases country, and defaults success by type', () => {
    const n = normalizeEvent({ type: 'LOGIN_FAILURE', actorEmail: 'A@B.TEST', country: 'us' });
    expect(n.actorEmail).toBe('a@b.test');
    expect(n.country).toBe('US');
    expect(n.success).toBe(false);
    expect(n.occurredAt).toBeInstanceOf(Date);
  });

  it('respects explicit success and parses occurredAt', () => {
    const n = normalizeEvent({
      type: 'LOGIN_SUCCESS',
      success: false,
      occurredAt: '2020-01-01T00:00:00.000Z',
    });
    expect(n.success).toBe(false);
    expect(n.occurredAt.toISOString()).toBe('2020-01-01T00:00:00.000Z');
  });
});
