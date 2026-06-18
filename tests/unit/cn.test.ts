import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/ui/cn';

describe('cn', () => {
  it('joins truthy class names with a space', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('supports conditional expressions', () => {
    const active = true;
    const error = false;
    expect(cn('base', active && 'active', error && 'error')).toBe('base active');
  });
});
