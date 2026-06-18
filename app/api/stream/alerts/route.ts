import { getCurrentActor } from '@/lib/auth/session';
import { subscribeAlerts } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

/** Server-Sent Events stream of new alerts for the current tenant. */
export async function GET() {
  const actor = await getCurrentActor();
  if (!actor) return new Response('Unauthorized', { status: 401 });

  const encoder = new TextEncoder();
  let unsubscribe = () => {};
  let ping: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      send({ type: 'ready' });
      unsubscribe = subscribeAlerts(actor.tenantId, (event) => send(event));
      ping = setInterval(() => controller.enqueue(encoder.encode(': ping\n\n')), 25_000);
    },
    cancel() {
      clearInterval(ping);
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
