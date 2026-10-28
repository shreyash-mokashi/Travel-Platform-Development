# Voyago — Deployment

This describes how to deploy Voyago publicly. **Nothing here has been executed** — no hosting
account, billing approval or external credentials were available during development, so the
project has not been deployed and there is no live URL. Everything below is written to be
followed, not to be taken as done.

---

## What has to run

| Component     | Needs                                                                |
| ------------- | -------------------------------------------------------------------- |
| `apps/web`    | Node 20 runtime with Next.js server rendering (not a static export)  |
| `apps/api`    | Long-running Node 20 process                                         |
| PostgreSQL 16 | Managed instance with automated backups                              |
| MongoDB 7     | Managed instance (optional — the app degrades gracefully without it) |

The frontend uses Server Components, server actions and `httpOnly` cookies, so it **must** be
deployed as a Node server. A static host will not work.

---

## Recommended hosting

| Component  | Recommendation                | Why                                                   | Free tier                                |
| ---------- | ----------------------------- | ----------------------------------------------------- | ---------------------------------------- |
| Web        | **Vercel**                    | First-party Next.js support; zero build configuration | Yes, suitable for a demo                 |
| API        | **Render** or **Railway**     | Native NestJS support, health checks, managed TLS     | Render free tier sleeps after inactivity |
| PostgreSQL | **Neon** or Render PostgreSQL | Neon's free tier is generous and supports branching   | Yes                                      |
| MongoDB    | **MongoDB Atlas M0**          | Free shared cluster, ample for editorial content      | Yes                                      |

**Simpler alternative:** deploy both apps on Render. One provider, one dashboard, and the API
and database share a private network. The trade-off is a slower cold start for the frontend
than Vercel gives.

### Cost

Everything above fits in free tiers for a portfolio demo. The practical limits are Render's
free services sleeping after 15 minutes of inactivity (first request takes ~30 seconds) and
Neon's compute suspending when idle. For a demo that is being shown live, budget roughly
**USD 7–14/month** to keep the API and database always on.

---

## Before deploying

Complete all of these first:

- [ ] Generate **new** secrets — never reuse development values:
      `openssl rand -base64 48` for `JWT_ACCESS_SECRET` and again for `JWT_REFRESH_SECRET`
- [ ] Confirm `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` differ (the API refuses to boot in
      production if they match)
- [ ] Set `NODE_ENV=production`, which turns on `secure` cookies and disables Swagger
- [ ] Set `CORS_ORIGINS` to the exact frontend origin — never `*`
- [ ] Decide the seed strategy (see **Seeding production** below)
- [ ] Confirm `.env` files are git-ignored and no secret is in the repository history

---

## 1. Provision the databases

### PostgreSQL (Neon)

1. Create a project and a database named `voyago`.
2. Copy the pooled connection string.
3. Append `?sslmode=require` — this becomes `DATABASE_URL`.

### MongoDB (Atlas)

1. Create a free M0 cluster.
2. Add a database user with read/write on `voyago_content`.
3. Allow access from your API host (or `0.0.0.0/0` for a demo, accepting the exposure).
4. Copy the `mongodb+srv://…` string — this becomes `MONGODB_URI`.

---

## 2. Deploy the API

On Render, create a **Web Service** from the repository:

| Setting           | Value                                                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime           | Node 20                                                                                                                                                                        |
| Build command     | `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @voyago/shared build && pnpm --filter @voyago/api exec prisma generate && pnpm --filter @voyago/api build` |
| Start command     | `pnpm --filter @voyago/api exec prisma migrate deploy && pnpm --filter @voyago/api start`                                                                                      |
| Health check path | `/api/v1/health/ready`                                                                                                                                                         |

Running `prisma migrate deploy` in the **start** command (not the build) means migrations are
applied against the live database on every boot, and never generate new SQL.

### Environment variables

```
NODE_ENV=production
API_PORT=10000                 # Render injects PORT; match it
DATABASE_URL=postgresql://…?sslmode=require
MONGODB_URI=mongodb+srv://…/voyago_content
JWT_ACCESS_SECRET=<openssl rand -base64 48>
JWT_REFRESH_SECRET=<a different one>
JWT_ACCESS_TTL=900s
JWT_REFRESH_TTL=7d
CORS_ORIGINS=https://your-frontend-domain
THROTTLE_TTL_SECONDS=60
THROTTLE_LIMIT=120
AUTH_THROTTLE_LIMIT=10          # keep this strict in production
LOG_LEVEL=info
```

Leave `SEED_DEMO_*_PASSWORD` **unset** so the seed generates random passwords rather than
creating an account with a known one.

Verify after deploy:

```bash
curl https://your-api-domain/api/v1/health/ready
```

Both checks must report `up` before continuing.

---

## 3. Deploy the frontend

On Vercel, import the repository:

| Setting         | Value                                                                   |
| --------------- | ----------------------------------------------------------------------- |
| Framework       | Next.js                                                                 |
| Root directory  | `apps/web`                                                              |
| Install command | `corepack enable && pnpm install --frozen-lockfile`                     |
| Build command   | `pnpm --filter @voyago/shared build && pnpm --filter @voyago/web build` |

### Environment variables

```
NEXT_PUBLIC_API_URL=https://your-api-domain/api/v1
API_INTERNAL_URL=https://your-api-domain/api/v1
NEXT_PUBLIC_SITE_URL=https://your-frontend-domain
```

Then set `CORS_ORIGINS` on the API to the frontend domain Vercel issued, and redeploy the API.

---

## 4. Seeding production

The demo needs inventory, but seeding **truncates every table**. Never run it against a
database with real bookings.

Seed once, immediately after the first deploy and before sharing the URL:

```bash
DATABASE_URL="<production url>" MONGODB_URI="<production uri>" \
  pnpm --filter @voyago/api db:seed
```

The command prints the generated demo passwords **once**. Record them somewhere safe; they
cannot be recovered afterwards.

---

## 5. Verify the deployment

Check each of these against the live URLs:

- [ ] `GET /api/v1/health/ready` reports `ok` with both databases `up`
- [ ] The home page loads and shows six destinations
- [ ] A search returns priced results
- [ ] Hotel detail shows rooms with cancellation policies
- [ ] Registration and login succeed, and the session survives a refresh
- [ ] A full booking completes with a successful demo payment
- [ ] The voucher renders and prints
- [ ] Cancellation produces the refund the policy specifies
- [ ] A second account **cannot** open the first account's booking
- [ ] `/api/docs` is **not** reachable in production
- [ ] An error response contains no stack trace
- [ ] The whole flow works on a phone

---

## Operational notes

**HTTPS** is terminated by both Vercel and Render automatically. Cookies are issued with
`secure` whenever `NODE_ENV=production`.

**Logging** is structured JSON on stdout, which both platforms collect. Request bodies are
never logged, so passwords, tokens and guest details stay out of the log stream. Each line
carries a `requestId` that is also returned in the `x-request-id` header.

**Health checks**: point the platform at `/api/v1/health/ready`, not `/health` — the readiness
probe verifies both databases.

**Backups**: enable automated PostgreSQL backups. MongoDB holds only regenerable content.

**Scaling**: the API is stateless apart from its database connections, so it scales
horizontally. Inventory holds live in PostgreSQL, so multiple instances stay consistent.

---

## Security posture for a public demo

- The public demo must keep using **seeded inventory and the payment simulator**. Do not wire a
  real payment gateway.
- The demo-payment disclaimer appears on the payment page, the booking page, the voucher and
  the site footer. Keep it there.
- Demo seed passwords are generated, printed once and never committed.
- `robots` metadata is set to `noindex, nofollow` so a demo booking site is not indexed.
- Rate limiting is on by default; keep `THROTTLE_LIMIT` modest on a public host.

---

## Remaining external actions

These need account access and cannot be done from the repository:

1. Create the Vercel, Render (or Railway), Neon and MongoDB Atlas accounts.
2. Approve any billing required to keep services always-on.
3. Generate production secrets and store them in each platform's secret manager.
4. Connect the GitHub repository to both hosting providers.
5. Run the production seed once and record the generated demo passwords.
6. Point a custom domain at the frontend, if one is wanted.
