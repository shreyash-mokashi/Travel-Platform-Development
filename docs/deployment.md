# Voyago — Deployment

**Nothing here has been executed.** Voyago has not been deployed and there is no live URL.
This is a guide to follow, not a record of something done.

Everything below is **free and needs no card**: both applications on Vercel Hobby, PostgreSQL
on Neon, MongoDB on Atlas M0.

> Free-tier terms change often. Check each provider's current limits before committing.

---

## The target

| Component  | Host                             | Free tier           | Notes                                          |
| ---------- | -------------------------------- | ------------------- | ---------------------------------------------- |
| `apps/web` | Vercel Hobby                     | Yes, non-commercial | A personal portfolio qualifies                 |
| `apps/api` | Vercel Hobby, a _second_ project | Yes                 | Runs as serverless functions                   |
| PostgreSQL | Neon                             | Yes, ~0.5 GB        | Compute auto-suspends, wakes in about a second |
| MongoDB    | Atlas M0                         | Yes, 512 MB         | Optional — see below                           |

**Why not Render.** Render was the original plan and `render.yaml` is still in the repository,
but Render now requires card verification even when every service is free. Vercel Hobby does
not, and it is already hosting the frontend. Render remains a perfectly good option if you do
not mind adding a card — see [Deploying the API to Render instead](#deploying-the-api-to-render-instead).

**MongoDB is optional.** `ContentService` catches failures and returns `null`, so without it
hotel pages render without their destination guide and the admin snapshot counter reads 0.
Nothing else changes, and it can be added later with no code change.

### What running the API as functions means

A cold invocation bootstraps Nest before serving, which costs a second or two. The handler
caches the application on the module, so warm invocations skip that entirely and reuse the
existing database connections.

Two behaviours genuinely change, both accepted deliberately:

- **Rate limiting weakens.** `@nestjs/throttler` counts requests in memory and each instance
  has its own. The limits still bound a single instance but no longer bound a caller across
  instances. A shared store would be needed for that, which is not worth adding here.
- **Use Neon's pooled endpoint for `DATABASE_URL`.** Many short-lived instances each opening a
  connection is exactly what a transaction pooler exists for. `DIRECT_URL` stays on the direct
  endpoint, because Prisma Migrate needs advisory locks that a pooler does not preserve.

---

## Files already in the repository

| File                          | Purpose                                                         |
| ----------------------------- | --------------------------------------------------------------- |
| `apps/web/vercel.json`        | Install and build commands for the frontend                     |
| `apps/api/vercel.json`        | Install and build commands for the API, and its function config |
| `apps/api/api/[[...path]].js` | The serverless entry point                                      |
| `apps/api/src/serverless.ts`  | Bootstraps and caches the Nest application                      |
| `render.yaml`                 | Kept for the Render alternative                                 |

No secret is committed in any of them.

---

## Before you start

- [ ] Generate two **new** secrets — never reuse development values:
      `openssl rand -base64 48` once for `JWT_ACCESS_SECRET`, again for `JWT_REFRESH_SECRET`
- [ ] Confirm the two differ (the API refuses to boot in production if they match)

---

## 1. PostgreSQL on Neon

1. Create a project; name the database `voyago`.
2. Neon shows two endpoints. You need **both**:

   | Variable       | Neon endpoint                                    | Used by             |
   | -------------- | ------------------------------------------------ | ------------------- |
   | `DATABASE_URL` | pooled — hostname contains `-pooler`             | the running API     |
   | `DIRECT_URL`   | direct — the same hostname **without** `-pooler` | Prisma Migrate only |

3. Make sure both end with `?sslmode=require`.

Prisma Migrate takes a PostgreSQL advisory lock, which does not survive a transaction pooler,
so `prisma migrate deploy` against the pooled endpoint fails or hangs. The schema declares
`directUrl`, so migrations use the direct connection while the application keeps the pooled one.

## 2. MongoDB on Atlas

1. Create a free **M0** cluster.
2. Add a database user with read/write on `voyago_content`.
3. Under Network Access allow `0.0.0.0/0`. Vercel functions do not have fixed egress addresses,
   so an allow-list is not practical here; the database holds only public demo content.
4. Copy the `mongodb+srv://…` string and append the database name: `…/voyago_content`.

## 3. Migrate and seed, from your machine

Do this **before** deploying, so the API has a schema and data to serve. It needs no hosting
account — it talks to Neon and Atlas directly.

```bash
# Migrations and seeding both use the DIRECT endpoint: they are long
# transactions and a pooler can drop them.
DATABASE_URL="<neon direct url>" \
DIRECT_URL="<neon direct url>" \
  pnpm --filter @voyago/api exec prisma migrate deploy

DATABASE_URL="<neon direct url>" \
DIRECT_URL="<neon direct url>" \
MONGODB_URI="<atlas uri>" \
SEED_DEMO_CUSTOMER_PASSWORD="<pick one>" \
SEED_DEMO_ADMIN_PASSWORD="<pick another>" \
  pnpm --filter @voyago/api db:seed
```

The seed **truncates every table**. Run it once, before sharing the link, and never against a
database holding bookings you care about. Leaving the two password variables unset generates
random ones and prints them once — record them, they cannot be recovered.

### Adding a new service to a database already in use

When a later migration introduces a service, the new tables arrive empty and `db:seed` is the
wrong tool — it would wipe the bookings people have already made. Migrate, then run the
service's own additive seeder. For flights:

> **Order matters. Migrate and seed _before_ pushing the code that reads the new tables.**
> Vercel deploys on push, so a push that lands first puts live code in front of tables that do
> not exist yet. This happened once: every `/flights/airports` call returned 500 and took the
> home page down with it (see D11 in `docs/qa-audit.md`). The pages now degrade instead of
> failing, but the correct sequence is still migrate → seed → push.

```bash
DATABASE_URL="<neon direct url>" \
DIRECT_URL="<neon direct url>" \
  pnpm --filter @voyago/api exec prisma migrate deploy

# Clears and rebuilds only the flight tables. Hotels, users, existing hotel
# bookings and Mongo content are untouched.
DATABASE_URL="<neon direct url>" \
DIRECT_URL="<neon direct url>" \
  pnpm --filter @voyago/api db:seed:flights
```

## 4. Deploy the API to Vercel

A **second** Vercel project, from the same repository.

1. Add New → Project → the same repo.
2. **Root Directory → `apps/api`** — type it exactly, with no leading space.
3. Vercel reads `apps/api/vercel.json` for the rest.
4. Environment variables:

   ```
   NODE_ENV=production
   DATABASE_URL=<neon POOLED url>
   DIRECT_URL=<neon direct url>
   MONGODB_URI=<atlas uri>
   JWT_ACCESS_SECRET=<openssl rand -base64 48>
   JWT_REFRESH_SECRET=<a different one>
   JWT_ACCESS_TTL=900s
   JWT_REFRESH_TTL=7d
   THROTTLE_TTL_SECONDS=60
   THROTTLE_LIMIT=120
   AUTH_THROTTLE_LIMIT=10
   LOG_LEVEL=info
   CORS_ORIGINS=https://<your-frontend>.vercel.app
   ```

   Set `CORS_ORIGINS` to a placeholder for now if the frontend does not exist yet.

5. Deploy, then check:

   ```bash
   curl https://<your-api-project>.vercel.app/api/v1/health/ready
   ```

   Both checks must report `up`. The root path serves a small placeholder page; the API itself
   lives under `/api/v1`.

## 5. Deploy the frontend to Vercel

1. The frontend project with **Root Directory → `apps/web`**.
2. Environment variables:

   ```
   NEXT_PUBLIC_API_URL=https://<your-api-project>.vercel.app/api/v1
   API_INTERNAL_URL=https://<your-api-project>.vercel.app/api/v1
   NEXT_PUBLIC_SITE_URL=https://<your-frontend>.vercel.app
   ```

   Include the `/api/v1` suffix. If either of the first two is missing the build fails on
   purpose, naming the variable — a deploy that silently points at `localhost` is worse than one
   that does not finish.

3. Deploy, then **go back to the API project** and set `CORS_ORIGINS` to the exact frontend
   origin, with no trailing slash. Redeploy the API.

   Skipping that last step is the most common cause of a frontend that loads but cannot search.

---

## 6. Verify

Against the live URLs:

- [ ] `/api/v1/health/ready` reports `ok` with both databases `up`
- [ ] The home page loads and shows six destinations
- [ ] A search returns priced results
- [ ] Hotel detail shows rooms with cancellation policies
- [ ] Registration and login work, and the session survives a refresh
- [ ] A full booking completes with a successful demo payment
- [ ] The voucher renders and prints
- [ ] Cancellation produces the refund the policy specifies
- [ ] A second account **cannot** open the first account's booking
- [ ] `/api/v1/../api/docs` is **not** reachable (Swagger is disabled in production)
- [ ] No error response contains a stack trace
- [ ] The whole flow works on a phone

---

## Operational notes

**HTTPS** is automatic. Cookies carry `secure` whenever `NODE_ENV=production`.

**Logging** is structured JSON, collected by Vercel. Request bodies are never logged, so
passwords, tokens and guest details stay out of the log stream. Every line carries a
`requestId`, also returned in the `x-request-id` header.

**Backups**: enable Neon's retention. MongoDB holds only regenerable content.

**Keeping the demo honest**: it must keep using seeded inventory and the payment simulator.
The demo-payment disclaimer appears on the payment page, the booking page, the voucher and the
footer — leave it there. `AUTH_THROTTLE_LIMIT` stays at 10 in production. Metadata is
`noindex, nofollow` so a demo booking site is not indexed.

---

## What still needs you

1. Create the Vercel, Neon and MongoDB Atlas accounts.
2. Generate the two JWT secrets.
3. Run the migration and seed from your machine (step 3).
4. Create the two Vercel projects and set their Root Directories.
5. Cross-wire the API URL and `CORS_ORIGINS`.

---

## Deploying the API to Render instead

Render is a good host for this API — it gives a long-running process, so rate limiting and
connection pooling behave exactly as tested locally. It requires a card on file for
verification, though the free instance stays $0 and a free instance sleeps after about 15
minutes of inactivity.

`render.yaml` describes the service, but note that Render's **New → Web Service** form does
not read it; only **Blueprints → New Blueprint Instance** does, and Blueprints are what
require the card. To fill the Web Service form by hand:

| Field                              | Value                  |
| ---------------------------------- | ---------------------- |
| Language                           | Node                   |
| Branch                             | `main`                 |
| **Root Directory**                 | **leave empty**        |
| Instance type                      | Free                   |
| Health Check Path (under Advanced) | `/api/v1/health/ready` |

Root Directory must stay empty: the build runs pnpm workspace commands that need the
repository root.

**Build Command**

```
corepack enable && pnpm install --frozen-lockfile && pnpm --filter @voyago/shared build && pnpm --filter @voyago/api exec prisma generate && pnpm --filter @voyago/api build
```

**Start Command** — replace the autofilled `yarn start`; this repository has no yarn and no
root start script.

```
pnpm --filter @voyago/api exec prisma migrate deploy && pnpm --filter @voyago/api start
```

**Environment variables**: the same list as step 4, plus `NODE_VERSION=20.19.0` and
`COREPACK_ENABLE_DOWNLOAD_PROMPT=0` (corepack otherwise prompts before downloading pnpm, which
hangs on a non-interactive build machine). Render injects `PORT` itself; do not set it.

With Render, `.github/workflows/keep-warm.yml` becomes useful: set the repository variable
`API_HEALTH_URL` to the service's health endpoint and it pings every 10 minutes, avoiding the
cold start. It is a no-op until that variable exists.

---

## If you outgrow the free tier

| Problem                                           | Fix                                                                  | Rough cost                          |
| ------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------- |
| Rate limiting must hold across instances          | A long-running host (Render Starter) or a shared throttler store     | ~USD 7/month                        |
| Database suspends too aggressively                | Neon Launch plan                                                     | ~USD 19/month                       |
| Vercel Hobby's non-commercial terms no longer fit | Vercel Pro                                                           | ~USD 20/month                       |
| You want everything always-on and cheap           | One Oracle Cloud Always Free ARM VM running the Docker Compose stack | Free, but you manage the VM and TLS |
