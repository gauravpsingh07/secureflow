import 'dotenv/config';
import { runDetectionAllTenants } from '@/lib/detection/run';
import { processPendingDeliveries } from '@/lib/webhooks/deliver';

const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? '5000');
let running = true;

const stop = () => {
  running = false;
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

async function tick(): Promise<void> {
  const start = Date.now();
  const summaries = await runDetectionAllTenants();
  const webhook = await processPendingDeliveries();
  const findings = summaries.reduce((a, s) => a + s.findings, 0);
  const created = summaries.reduce((a, s) => a + s.created, 0);
  if (summaries.length > 0 && (findings > 0 || created > 0 || webhook.attempted > 0)) {
    console.log(
      `[worker] ${summaries.length} tenant(s) · ${findings} findings · ${created} new alert(s) · ${webhook.delivered}/${webhook.attempted} webhooks · ${
        Date.now() - start
      }ms`,
    );
  }
}

async function loop(): Promise<void> {
  console.log(`[worker] detection loop started — every ${INTERVAL_MS}ms`);
  while (running) {
    try {
      await tick();
    } catch (err) {
      console.error('[worker] tick error:', err);
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
  console.log('[worker] stopped');
  process.exit(0);
}

void loop();
