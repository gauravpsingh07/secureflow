# Deploying SecureFlow

SecureFlow runs as a single Next.js app on **Vercel** with **Neon** (serverless Postgres).
Detection runs on a schedule via Vercel Cron — no separate worker process is needed in
production.

## 1. Database (Neon)

1. Create a project at [neon.tech](https://neon.tech) and copy the pooled connection string.
2. It becomes `DATABASE_URL` (Prisma + `@prisma/adapter-pg` work over the pooled endpoint).

## 2. App (Vercel)

1. Import the repo into Vercel.
2. Set environment variables:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Neon connection string |
   | `AUTH_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
   | `AUTH_TRUST_HOST` | `true` |
   | `CRON_SECRET` | a random string (Vercel Cron sends it as a Bearer token; the job route accepts it) |
   | `DETECTION_WINDOW_MINUTES` | `15` (optional) |
   | `DEMO_MODE` | `true` for a public read-only demo, otherwise unset |

3. The build command (in `vercel.json`) runs `prisma migrate deploy && next build`, so
   migrations apply automatically on each deploy.

## 3. Seed the demo (optional)

Run once against the production database to load the Northwind demo tenant:

```bash
DATABASE_URL="<neon-url>" pnpm db:seed
```

Then set `DEMO_MODE=true` in Vercel and redeploy. The landing page shows demo credentials
(`owner@northwind.test` / `demodemo`) and all mutations are disabled.

## 4. Scheduled detection

`vercel.json` registers a cron hitting `/api/jobs/run` every 5 minutes. With `CRON_SECRET`
set, the route rejects unauthenticated calls. This keeps alerts fresh without a long-running
worker. (Locally, run `pnpm worker` instead.)
