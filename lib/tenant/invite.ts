import { randomBytes } from 'node:crypto';

/** Opaque, URL-safe token for an invitation link. */
export function generateInviteToken(): string {
  return randomBytes(24).toString('base64url');
}
