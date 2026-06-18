import { scanText } from './scan';
import type { Finding, SecretRule } from './types';

/** Built-in detection rules. Ordered most-specific first; the engine dedupes by position. */
export const DEFAULT_RULES: SecretRule[] = [
  {
    id: 'aws-access-key-id',
    name: 'AWS Access Key ID',
    severity: 'high',
    pattern: /\b(AKIA[0-9A-Z]{16})\b/,
    remediation: 'Deactivate the key in IAM, rotate it, and use roles or a secrets manager instead.',
  },
  {
    id: 'aws-secret-access-key',
    name: 'AWS Secret Access Key',
    severity: 'high',
    pattern: /aws_?secret_?access_?key["'\s]*[=:]\s*['"]?([A-Za-z0-9/+=]{40})/i,
    minEntropy: 4,
    remediation: 'Rotate the AWS secret key immediately and store it in a secrets manager.',
  },
  {
    id: 'github-pat',
    name: 'GitHub personal access token',
    severity: 'high',
    pattern: /\b(ghp_[A-Za-z0-9]{36})\b/,
    remediation: 'Revoke the token in GitHub settings and issue a fine-grained replacement.',
  },
  {
    id: 'github-fine-grained-pat',
    name: 'GitHub fine-grained PAT',
    severity: 'high',
    pattern: /\b(github_pat_[A-Za-z0-9_]{59,})\b/,
    remediation: 'Revoke the token in GitHub settings.',
  },
  {
    id: 'stripe-live-secret',
    name: 'Stripe live secret key',
    severity: 'critical',
    pattern: /\b((?:sk|rk)_live_[A-Za-z0-9]{20,})\b/,
    remediation: 'Roll the key in the Stripe dashboard now and review recent API activity.',
  },
  {
    id: 'stripe-test-secret',
    name: 'Stripe test secret key',
    severity: 'medium',
    pattern: /\b(sk_test_[A-Za-z0-9]{20,})\b/,
    remediation: 'Roll the test key; avoid committing even test credentials.',
  },
  {
    id: 'slack-token',
    name: 'Slack token',
    severity: 'high',
    pattern: /\b(xox[baprs]-[A-Za-z0-9-]{10,})\b/,
    remediation: 'Revoke the token in the Slack admin console.',
  },
  {
    id: 'google-api-key',
    name: 'Google API key',
    severity: 'high',
    pattern: /\b(AIza[0-9A-Za-z\-_]{35})\b/,
    remediation: 'Restrict or regenerate the key in the Google Cloud console.',
  },
  {
    id: 'private-key',
    name: 'Private key',
    severity: 'critical',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/,
    remediation: 'Remove the key from source, rotate the key pair, and store it in a vault.',
  },
  {
    id: 'jwt',
    name: 'JSON Web Token',
    severity: 'medium',
    pattern: /\b(eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{6,})\b/,
    remediation: 'Invalidate the token and avoid logging or committing JWTs.',
  },
  {
    id: 'generic-secret',
    name: 'Generic high-entropy secret',
    severity: 'medium',
    pattern:
      /(?:secret|token|api[_-]?key|password|passwd|access[_-]?key)["'\s]*[=:]\s*['"]([^'"\s]{16,})['"]/i,
    minEntropy: 3.5,
    remediation: 'Move the secret to an environment variable or secrets manager and rotate it.',
  },
];

/** Scan text with the built-in ruleset. */
export function scan(text: string): Finding[] {
  return scanText(text, DEFAULT_RULES);
}
