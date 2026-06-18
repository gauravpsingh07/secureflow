import { prisma } from '@/lib/db/client';
import { hashApiKey } from '@/lib/apikey';

export type AuthedKey = { id: string; tenantId: string; rateLimitPerMin: number };

/**
 * Resolve an ingestion request's raw API key to its tenant. Returns null for a
 * missing, unknown, or revoked key. Lookup is by hash — the raw key is never stored.
 */
export async function authenticateApiKey(rawKey: string): Promise<AuthedKey | null> {
  if (!rawKey) return null;
  const key = await prisma.apiKey.findUnique({ where: { hashedKey: hashApiKey(rawKey) } });
  if (!key || key.revokedAt) return null;
  return { id: key.id, tenantId: key.tenantId, rateLimitPerMin: key.rateLimitPerMin };
}
