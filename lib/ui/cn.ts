/**
 * Tiny class-name joiner. Filters out falsy values so conditional classes can be
 * written inline: cn('base', isActive && 'active', error ? 'text-red-600' : null).
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
