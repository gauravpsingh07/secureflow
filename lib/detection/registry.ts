import type { Detector } from './types';
import { failedLoginSpike } from './detectors/failed-login-spike';
import { anomalousLoginRate } from './detectors/anomalous-login-rate';

/**
 * The active detectors. Each is a pure function of the detection context, so the
 * set can be run, tested, and evaluated in isolation.
 */
export const detectors: Detector[] = [failedLoginSpike, anomalousLoginRate];
