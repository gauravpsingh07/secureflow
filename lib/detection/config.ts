import type { DetectionContext } from './types';

/** Read a numeric threshold for a detector, falling back to its default. */
export function param(
  ctx: DetectionContext,
  detectorKey: string,
  name: string,
  fallback: number,
): number {
  const v = ctx.params?.[detectorKey]?.[name];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export type ParamSpec = { name: string; label: string; default: number; min: number; max: number };

/** Tunable parameters per detector, used to render the rule-config UI. */
export const DETECTOR_PARAMS: Record<string, ParamSpec[]> = {
  'failed-login-spike': [{ name: 'minFailures', label: 'Min failures', default: 8, min: 2, max: 100 }],
  'credential-stuffing': [{ name: 'minAccounts', label: 'Min accounts', default: 5, min: 2, max: 100 }],
  'impossible-travel': [
    { name: 'maxSpeedKmh', label: 'Max speed (km/h)', default: 900, min: 100, max: 5000 },
  ],
  'anomalous-login-rate': [
    { name: 'zThreshold', label: 'Z-score threshold', default: 3, min: 1, max: 10 },
  ],
  'new-device-ip': [],
};
