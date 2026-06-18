export const RISKY_ACTIONS = [
  {
    key: 'revoke_all_api_keys',
    label: 'Revoke all API keys',
    description: 'Immediately revokes every active ingestion key. New keys must be issued afterward.',
  },
  {
    key: 'bulk_resolve_alerts',
    label: 'Resolve all open alerts',
    description: 'Marks every open and acknowledged alert as resolved.',
  },
] as const;

export type RiskyActionKey = (typeof RISKY_ACTIONS)[number]['key'];

export function isRiskyAction(key: string): key is RiskyActionKey {
  return RISKY_ACTIONS.some((a) => a.key === key);
}

export function riskyActionLabel(key: string): string {
  return RISKY_ACTIONS.find((a) => a.key === key)?.label ?? key;
}
