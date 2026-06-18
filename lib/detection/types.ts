import type { SecurityEventType } from '@/lib/generated/prisma/enums';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

/** A detector-facing view of a security event (decoupled from the Prisma row). */
export type DetectorEvent = {
  id: string;
  type: SecurityEventType;
  actorEmail: string | null;
  ip: string | null;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  userAgent: string | null;
  success: boolean;
  occurredAt: Date;
};

/**
 * Everything a detector needs for one pass. `events` are inside the detection
 * window; `baseline` are older events used to establish "normal".
 */
export type DetectionContext = {
  tenantId: string;
  now: Date;
  windowStart: Date;
  windowMinutes: number;
  events: DetectorEvent[];
  baseline: DetectorEvent[];
  // Per-detector numeric threshold overrides (detectorKey → param → value).
  params?: Record<string, Record<string, number>>;
};

/** One finding. `score` is 0–100 and explainable; `evidence` carries the numbers behind it. */
export type DetectionResult = {
  detectorKey: string;
  severity: Severity;
  score: number;
  title: string;
  explanation: string;
  evidence: Record<string, unknown>;
  eventIds: string[];
  // Stable key used to correlate repeat firings of the same incident into one alert.
  dedupeKey: string;
};

export interface Detector {
  key: string;
  label: string;
  run(ctx: DetectionContext): DetectionResult[];
}
