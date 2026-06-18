import type { IngestEvent } from '@/lib/validation/event';

export type NormalizedEvent = {
  type: IngestEvent['type'];
  actorEmail: string | null;
  ip: string | null;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  userAgent: string | null;
  success: boolean;
  occurredAt: Date;
  raw: Record<string, unknown> | null;
};

/**
 * Turn a validated inbound event into the shape we persist: emails lowercased,
 * country codes uppercased, `occurredAt` parsed to a Date, and `success`
 * defaulted from the event type when the caller omits it.
 */
export function normalizeEvent(e: IngestEvent): NormalizedEvent {
  return {
    type: e.type,
    actorEmail: e.actorEmail ? e.actorEmail.toLowerCase() : null,
    ip: e.ip ?? null,
    country: e.country ? e.country.toUpperCase() : null,
    city: e.city ?? null,
    latitude: e.latitude ?? null,
    longitude: e.longitude ?? null,
    userAgent: e.userAgent ?? null,
    success: e.success ?? defaultSuccess(e.type),
    occurredAt: parseOccurredAt(e.occurredAt),
    raw: e.raw ?? null,
  };
}

function defaultSuccess(type: IngestEvent['type']): boolean {
  return type !== 'LOGIN_FAILURE';
}

function parseOccurredAt(value: string | number | undefined): Date {
  if (value === undefined) return new Date();
  const d = typeof value === 'number' ? new Date(value) : new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}
