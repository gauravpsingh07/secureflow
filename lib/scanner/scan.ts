import { shannonEntropy } from './entropy';
import { SEVERITY_RANK, type Finding, type SecretRule } from './types';

/** Mask a secret so findings never echo the raw value. */
export function maskSecret(s: string): string {
  if (s.length <= 8) return `${s.slice(0, 1)}***`;
  return `${s.slice(0, 4)}…${s.slice(-4)} (${s.length} chars)`;
}

function withGlobal(flags: string): string {
  return flags.includes('g') ? flags : `${flags}g`;
}

/**
 * Scan text with the given rules. Reports line/column, a masked match, and the
 * entropy of the captured value. When two rules hit the same position, the
 * higher-severity finding wins.
 */
export function scanText(text: string, rules: SecretRule[]): Finding[] {
  const byPosition = new Map<string, Finding>();
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const rule of rules) {
      const re = new RegExp(rule.pattern.source, withGlobal(rule.pattern.flags));
      for (const m of line.matchAll(re)) {
        const captured = m[1] ?? m[0];
        const entropy = shannonEntropy(captured);
        if (rule.minEntropy != null && entropy < rule.minEntropy) continue;

        const column = (m.index ?? 0) + 1;
        const key = `${i + 1}:${column}`;
        const finding: Finding = {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          line: i + 1,
          column,
          match: maskSecret(captured),
          entropy: Math.round(entropy * 100) / 100,
          remediation: rule.remediation,
        };
        const existing = byPosition.get(key);
        if (!existing || SEVERITY_RANK[finding.severity] > SEVERITY_RANK[existing.severity]) {
          byPosition.set(key, finding);
        }
      }
    }
  }

  return [...byPosition.values()].sort((a, b) => a.line - b.line || a.column - b.column);
}
