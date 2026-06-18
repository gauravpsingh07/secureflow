import { EventEmitter } from 'node:events';

export type AlertEvent = {
  type: 'alert';
  alertId: string;
  detectorKey: string;
  severity: string;
  title: string;
};

// Single in-process bus. Good for one instance / the demo; swap for Redis or a
// pub/sub service to fan out across multiple server instances. Note: a separate
// `pnpm worker` process won't share this emitter — trigger detection in-process
// (the cron route or the "Run detection now" action) to drive the live feed.
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

const channel = (tenantId: string) => `alerts:${tenantId}`;

export function publishAlertEvent(tenantId: string, event: AlertEvent): void {
  emitter.emit(channel(tenantId), event);
}

export function subscribeAlerts(tenantId: string, listener: (event: AlertEvent) => void): () => void {
  const ch = channel(tenantId);
  emitter.on(ch, listener);
  return () => {
    emitter.off(ch, listener);
  };
}
