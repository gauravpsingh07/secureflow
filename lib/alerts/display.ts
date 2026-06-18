import type { BadgeTone } from '@/components/ui/badge';
import type { AlertSeverity, AlertStatus } from '@/lib/generated/prisma/enums';

export function severityTone(s: AlertSeverity): BadgeTone {
  switch (s) {
    case 'CRITICAL':
      return 'critical';
    case 'HIGH':
      return 'warning';
    case 'MEDIUM':
      return 'info';
    default:
      return 'neutral';
  }
}

export function statusTone(s: AlertStatus): BadgeTone {
  switch (s) {
    case 'OPEN':
      return 'warning';
    case 'ACKNOWLEDGED':
      return 'info';
    default:
      return 'success';
  }
}

export function statusLabel(s: AlertStatus): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
