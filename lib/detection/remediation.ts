const REMEDIATION: Record<string, string> = {
  'failed-login-spike':
    'Lock or force a password reset on the targeted account and consider blocking the source IP. Confirm with the user whether the attempts were theirs.',
  'credential-stuffing':
    'Block the source IP, add rate limiting / CAPTCHA on login, and require MFA. Check whether any targeted account succeeded afterward.',
  'impossible-travel':
    'Treat as a possible account compromise: invalidate sessions, force re-authentication with MFA, and verify recent activity with the user.',
  'new-device-ip':
    'Confirm the new device/location with the account owner. If unrecognized, force re-authentication and review recent actions.',
  'anomalous-login-rate':
    'Investigate the spike — automation, a misconfigured client, or an attack. Throttle the account and verify the activity with the user.',
};

/** Suggested next step for an analyst, keyed by the detector that fired. */
export function remediationFor(detectorKey: string): string {
  return (
    REMEDIATION[detectorKey] ??
    'Investigate the contributing events and confirm whether the activity was expected.'
  );
}
