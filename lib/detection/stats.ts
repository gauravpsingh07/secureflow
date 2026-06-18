export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Sample standard deviation (n−1). Returns 0 for fewer than two values. */
export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const variance = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

/**
 * How many standard deviations `value` sits above the mean. When the baseline
 * has no spread, any value above the mean is treated as a strong signal.
 */
export function zScore(value: number, m: number, sd: number): number {
  if (sd === 0) return value > m ? Infinity : 0;
  return (value - m) / sd;
}
