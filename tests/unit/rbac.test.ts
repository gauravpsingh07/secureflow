import { describe, it, expect } from 'vitest';
import { canAccess, hasAtLeast, assertRole, ForbiddenError } from '@/lib/auth/rbac';

describe('rbac', () => {
  it('canAccess matches an explicit allow-list', () => {
    expect(canAccess('ADMIN', ['ADMIN', 'OWNER'])).toBe(true);
    expect(canAccess('VIEWER', ['ADMIN', 'OWNER'])).toBe(false);
  });

  it('hasAtLeast respects the privilege hierarchy', () => {
    expect(hasAtLeast('OWNER', 'ADMIN')).toBe(true);
    expect(hasAtLeast('ADMIN', 'ADMIN')).toBe(true);
    expect(hasAtLeast('ANALYST', 'ADMIN')).toBe(false);
    expect(hasAtLeast('VIEWER', 'ANALYST')).toBe(false);
  });

  it('assertRole throws ForbiddenError when the role is not allowed', () => {
    expect(() => assertRole('VIEWER', ['ADMIN'])).toThrow(ForbiddenError);
    expect(() => assertRole('ADMIN', ['ADMIN'])).not.toThrow();
  });
});
