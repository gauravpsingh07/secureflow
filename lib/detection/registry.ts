import type { Detector } from './types';

/**
 * The active detectors. Each is a pure function of the detection context, so the
 * set can be run, tested, and evaluated in isolation. Detectors are registered
 * here as later commits add them.
 */
export const detectors: Detector[] = [];
