/**
 * Shannon entropy of a string in bits per character. Random secrets sit high
 * (~4–6); English prose and repetitive strings sit low (~2–3). Used to suppress
 * false positives from generic rules.
 */
export function shannonEntropy(s: string): number {
  if (!s) return 0;
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / s.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}
