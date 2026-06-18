import { runDetectionAllTenants } from '@/lib/detection/run';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Triggers a detection pass for all tenants. Wired to Vercel Cron (see
 * vercel.json) which calls it via GET. Protected by JOBS_RUN_SECRET when set;
 * open in local dev when unset.
 */
function authorized(req: Request): boolean {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`; accept either name.
  const secret = process.env.JOBS_RUN_SECRET ?? process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

async function handle(req: Request): Promise<Response> {
  if (!authorized(req)) return new Response('Unauthorized', { status: 401 });
  const summaries = await runDetectionAllTenants();
  const created = summaries.reduce((a, s) => a + s.created, 0);
  return Response.json({ ok: true, tenants: summaries.length, newAlerts: created, summaries });
}

export const GET = handle;
export const POST = handle;
