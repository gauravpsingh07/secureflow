export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type SecretRule = {
  id: string;
  name: string;
  severity: Severity;
  pattern: RegExp;
  // If set, the captured secret must have at least this Shannon entropy (bits
  // per char) to count — used to keep generic rules from flagging plain text.
  minEntropy?: number;
  remediation: string;
};

export type Finding = {
  ruleId: string;
  ruleName: string;
  severity: Severity;
  line: number; // 1-based
  column: number; // 1-based
  match: string; // masked, never the raw secret
  entropy: number;
  remediation: string;
};

export const SEVERITY_RANK: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};
