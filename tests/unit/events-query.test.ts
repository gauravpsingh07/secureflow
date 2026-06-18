import { describe, it, expect } from 'vitest';
import { parseEventFilters, buildEventWhere, eventsHref } from '@/lib/events/query';

describe('parseEventFilters', () => {
  it('keeps a valid type and drops an invalid one', () => {
    expect(parseEventFilters({ type: 'LOGIN_SUCCESS' }).type).toBe('LOGIN_SUCCESS');
    expect(parseEventFilters({ type: 'BOGUS' }).type).toBeUndefined();
  });

  it('normalizes success and trims text fields', () => {
    expect(parseEventFilters({ success: 'true' }).success).toBe('true');
    expect(parseEventFilters({ success: 'maybe' }).success).toBeUndefined();
    expect(parseEventFilters({ actor: '  a@b  ' }).actor).toBe('a@b');
    expect(parseEventFilters({ actor: '   ' }).actor).toBeUndefined();
  });
});

describe('buildEventWhere', () => {
  it('maps filters onto a where clause', () => {
    const w = buildEventWhere({ type: 'LOGIN_FAILURE', success: 'false' });
    expect(w.type).toBe('LOGIN_FAILURE');
    expect(w.success).toBe(false);
  });

  it('expands q into an OR across columns', () => {
    const w = buildEventWhere({ q: 'foo' });
    expect(Array.isArray(w.OR)).toBe(true);
    expect((w.OR as unknown[]).length).toBeGreaterThan(1);
  });
});

describe('eventsHref', () => {
  it('serializes filters plus extra params', () => {
    expect(eventsHref({ type: 'LOGOUT' }, { page: '2' })).toBe('/events?type=LOGOUT&page=2');
    expect(eventsHref({})).toBe('/events');
  });
});
