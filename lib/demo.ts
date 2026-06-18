/**
 * When DEMO_MODE is on, the app is a public read-only showcase: reads and
 * sign-in work, but mutations are blocked so visitors can't alter shared data.
 */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true';
}

export const DEMO_MESSAGE = 'Read-only demo — changes are disabled.';
