import { z } from 'zod';

export const eventTypeEnum = z.enum([
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'LOGOUT',
  'PASSWORD_RESET',
  'MFA_CHALLENGE',
  'API_REQUEST',
  'PERMISSION_CHANGE',
]);

/** A single inbound security event. All fields but `type` are optional. */
export const ingestEventSchema = z.object({
  type: eventTypeEnum,
  actorEmail: z.email().optional(),
  ip: z.string().max(45).optional(), // up to IPv6 length
  country: z.string().length(2).optional(), // ISO-3166 alpha-2
  city: z.string().max(120).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  userAgent: z.string().max(512).optional(),
  success: z.boolean().optional(),
  // ISO-8601 string or epoch milliseconds.
  occurredAt: z.union([z.string(), z.number()]).optional(),
  raw: z.record(z.string(), z.unknown()).optional(),
});

export type IngestEvent = z.infer<typeof ingestEventSchema>;

/** The request body: a single event, an array, or `{ events: [...] }`. */
export const ingestPayloadSchema = z.union([
  ingestEventSchema,
  z.array(ingestEventSchema).min(1).max(500),
  z.object({ events: z.array(ingestEventSchema).min(1).max(500) }),
]);

/** Flatten any accepted payload shape into a plain array of events. */
export function toEventArray(payload: z.infer<typeof ingestPayloadSchema>): IngestEvent[] {
  if (Array.isArray(payload)) return payload;
  if ('events' in payload) return payload.events;
  return [payload];
}
