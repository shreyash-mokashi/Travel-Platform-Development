# Voyago — Deployment

**Nothing here has been executed.** No hosting account, billing approval or external
credential was available during development, so Voyago has not been deployed and there is no
live URL. This is a guide to follow, not a record of something done.

The chosen path is **entirely free**: Vercel for the frontend, Render for the API, Neon for
PostgreSQL and MongoDB Atlas for content. The repository already contains the configuration
for it.

> Free-tier terms change often. Check each provider's current limits before committing.

---

## The target

| Component  | Host                   | Free tier           | Catch                                                  |
| ---------- | ---------------------- | ------------------- | ------------------------------------------------------ |
| `apps/web` | **Vercel** Hobby       | Yes, non-commercial | Personal portfolio qualifies                           |
| `apps/api` | **Render** web service | Yes                 | **Sleeps after ~15 min idle**; next request waits ~50s |
| PostgreSQL | **Neon**               | Yes, ~0.5 GB        | Compute auto-suspends, wakes in about a second         |
| MongoDB    | **Atlas M0**           | Yes, 512 MB         | Shared cluster, ample here                             |

**Do not use Render's free PostgreSQL.** It is deleted after 30 days, which kills a portfolio
link you intend to leave up. Neon's free database has no such expiry.

### About the cold start

This is the one real compromise of an all-free setup. Three things already mitigate it:

1. `apps/web/src/lib/api.ts` waits up to 25 seconds and then shows _"The booking service is
   waking up… please try again in a moment"_ rather than a generic error.
2. Data-fetching pages set `export const maxDuration = 60`, so Vercel does not kill the render
   while the API wakes.
3. `.github/workflows/keep-warm.yml` pings the API every 10 minutes. Set the repository
   variable `API_HEALTH_URL` to enable it; it is a no-op until then.

With the keep-warm workflow on, visitors should rarely meet a cold start.

---

## Files already in the repository

| File                              | Purpose                                                                 |
| --------------------------------- | ----------------------------------------------------------------------- |
| `render.yaml`                     | Render blueprint for the API: build, start, health check, env var names |
| `apps/web/vercel.json`            | Vercel install and build commands for the pnpm monorepo                 |
| `.github/workflows/keep-warm.yml` | Optional cold-start mitigation                                          |

`render.yaml` marks every secret `sync: false`, so Render prompts for them and stores them
itself. **No real secret is in the repository.**

---

## Before you start

- [ ] Generate two **new** secrets — never reuse development values:
      `openssl rand -base64 48` once for `JWT_ACCESS_SECRET`, again for `JWT_REFRESH_SECRET`
- [ ] Confirm the two differ (the API refuses to boot in production if they match)
- [ ] Decide the seed strategy — see [step 5](#5-seed-the-demo-data-once)

---

## 1. PostgreSQL on Neon

1. Create a project; name the database `voyago`.
2. Neon shows two endpoints. You need **both**:

   | Render variable | Neon endpoint                                    | Used by             |
   | --------------- | ------------------------------------------------ | ------------------- |
   | `DATABASE_URL`  | pooled — hostname contains `-pooler`             | the running API     |
   | `DIRECT_URL`    | direct — the same hostname **without** `-pooler` | Prisma Migrate only |

3. Make sure both end with `?sslmode=require`.

**Why two.** Prisma Migrate takes a PostgreSQL advisory lock, which does not
survive a transaction pooler, so `prisma migrate deploy` against the pooled
endpoint fails or hangs. The schema declares `directUrl`, so migrations use the
direct connection while the application keeps the pooled one.

If you would rather keep it simple, put the **direct** URL in both variables.
A single Render service is one long-lived process with Prisma's own pool, so
it does not need PgBouncer.

## 2. MongoDB on Atlas

1. Create a free **M0** cluster.
2. Add a database user with read/write on `voyago_content`.
3. Under Network Access, allow your Render service's egress, or `0.0.0.0/0` for a demo while
   accepting the exposure.
4. Copy the `mongodb+srv://…` string and append the database name: `…/voyago_content`.

This becomes `MONGODB_URI`.

> MongoDB is **optional**. If you skip it, hotel pages render without their destination guide
> and the admin snapshot counter reads 0. Nothing else changes, and you can add it later
> without a code change.

## 3. API on Render

1. Use **New → Web Service**, and fill it in from
   [Manual Render settings](#manual-render-settings) below.

   Render has a Blueprint flow that reads `render.yaml` and fills the form for
   you, but **it requires a payment method on file even for free services**.
   The manual form needs no card and produces an identical service, so it is
   the documented path here. `render.yaml` is kept in the repository as the
   source of truth for those settings — if you change one, change the other.

   Note that the form autofills its own guesses, typically `yarn start` and a
   root `pnpm run build`. Both are wrong for this repository: there is no yarn
   and no root start script, and the root build compiles the frontend too.
   Replace both.

2. It will prompt for the four `sync: false` values:

   | Variable             | Value                                             |
   | -------------------- | ------------------------------------------------- |
   | `DATABASE_URL`       | the Neon string from step 1                       |
   | `MONGODB_URI`        | the Atlas string from step 2                      |
   | `JWT_ACCESS_SECRET`  | `openssl rand -base64 48`                         |
   | `JWT_REFRESH_SECRET` | a different `openssl rand -base64 48`             |
   | `CORS_ORIGINS`       | leave a placeholder for now; you set it in step 4 |

3. Deploy. The start command runs `prisma migrate deploy` before booting, so the schema is
   created on first start.
4. Verify:

   ```bash
   curl https://<your-service>.onrender.com/api/v1/health/ready
   ```

   Both checks must report `up`. Note the URL — it is `API_INTERNAL_URL` in the next step.

## 4. Frontend on Vercel

1. Import the repository, then **Settings → General → Root Directory → `apps/web`**.

   This is not optional and it is the most common failure. Left unset, Vercel
   builds from the repository root, runs the root `build` script, and tries to
   compile the **API** as well — which it should never do. The symptom is a
   build log containing `pnpm --filter @voyago/api build`.

2. Vercel then reads `apps/web/vercel.json` for the install and build commands.
   `pnpm install` from `apps/web` still installs all four workspace projects,
   and `--filter` resolves across the workspace, so nothing else is needed.
3. Environment variables:

   ```
   NEXT_PUBLIC_API_URL=https://<your-service>.onrender.com/api/v1
   API_INTERNAL_URL=https://<your-service>.onrender.com/api/v1
   NEXT_PUBLIC_SITE_URL=https://<your-project>.vercel.app
   ```

4. Deploy. If `NEXT_PUBLIC_API_URL` or `API_INTERNAL_URL` is missing the build
   fails on purpose, naming the variable — a deploy that silently points at
   `localhost` is worse than one that does not finish.

   Then **go back to Render** and set `CORS_ORIGINS` to the exact Vercel origin
   (`https://<your-project>.vercel.app`, no trailing slash). Redeploy the API.

   Skipping this is the single most common cause of a frontend that loads but cannot search.

## 5. Seed the demo data, once

The demo needs inventory, but **the seed truncates every table**. Run it once, immediately
after the first deploy and before sharing the link. Never run it against a database holding
bookings you care about.

```bash
DATABASE_URL="<neon url>" \
MONGODB_URI="<atlas uri>" \
SEED_DEMO_CUSTOMER_PASSWORD="<choose one>" \
SEED_DEMO_ADMIN_PASSWORD="<choose another>" \
  pnpm --filter @voyago/api db:seed
```

If you leave the two password variables unset the seed generates random ones and prints them
**once** — record them, they cannot be recovered.

## 6. Keep the API warm (optional but recommended)

In the repository: Settings → Secrets and variables → Actions → **Variables** → New variable:

```
API_HEALTH_URL = https://<your-service>.onrender.com/api/v1/health
```

The workflow starts pinging on the next schedule. Without this, expect a ~50 second wait on
the first visit after a quiet period.

---

## 7. Verify the deployment

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
- [ ] `/api/docs` is **not** reachable (Swagger is disabled in production)
- [ ] No error response contains a stack trace
- [ ] The whole flow works on a phone

---

## Operational notes

**HTTPS** is automatic on both Vercel and Render. Cookies carry `secure` whenever
`NODE_ENV=production`.

**Logging** is structured JSON on stdout, collected by both platforms. Request bodies are
never logged, so passwords, tokens and guest details stay out of the log stream. Every line
carries a `requestId`, also returned in the `x-request-id` header.

**Health checks**: Render is pointed at `/api/v1/health/ready`, which verifies both databases,
not the shallower `/health`.

**Backups**: enable Neon's retention. MongoDB holds only regenerable content.

**Scaling**: the API is stateless apart from database connections. Inventory holds live in
PostgreSQL, so multiple instances stay consistent if you ever move off the free plan.

---

## Keeping the public demo safe

- The demo must keep using **seeded inventory and the payment simulator**. Do not wire a real
  payment gateway.
- The demo-payment disclaimer appears on the payment page, the booking page, the voucher and
  the footer. Leave it there.
- `AUTH_THROTTLE_LIMIT` stays at **10** in production. Only local and CI raise it.
- Metadata is `noindex, nofollow` so a demo booking site is not indexed.
- Demo passwords are generated at seed time, printed once, and never committed.

---

## What still needs you

I cannot create accounts or approve billing. The remaining steps:

1. Create the Vercel, Render, Neon and MongoDB Atlas accounts.
2. Generate the two JWT secrets and paste them into Render.
3. Connect this repository to Vercel and Render.
4. Set `CORS_ORIGINS` on Render once Vercel issues the domain.
5. Run the seed once and record the demo passwords.
6. Optionally set the `API_HEALTH_URL` repository variable.

---

## If you outgrow the free tier

| Problem                                           | Fix                                                                  | Rough cost                          |
| ------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------- |
| Cold starts are unacceptable                      | Render Starter instance                                              | ~USD 7/month                        |
| Database suspends too aggressively                | Neon Launch plan                                                     | ~USD 19/month                       |
| Vercel Hobby's non-commercial terms no longer fit | Vercel Pro                                                           | ~USD 20/month                       |
| You want everything always-on and cheap           | One Oracle Cloud Always Free ARM VM running the Docker Compose stack | Free, but you manage the VM and TLS |

---

## Manual Render settings

This is the recommended path, because Blueprints require a card on file.
These values mirror `render.yaml`; if you change one, change both.

| Field                              | Value                  |
| ---------------------------------- | ---------------------- |
| Language                           | Node                   |
| Branch                             | `main`                 |
| **Root Directory**                 | **leave empty**        |
| Instance type                      | Free                   |
| Health Check Path (under Advanced) | `/api/v1/health/ready` |

**Root Directory must stay empty.** The build runs pnpm workspace commands that
need the repository root; pointing it at `apps/api` breaks the workspace.

**Build Command**

```
corepack enable && pnpm install --frozen-lockfile && pnpm --filter @voyago/shared build && pnpm --filter @voyago/api exec prisma generate && pnpm --filter @voyago/api build
```

**Start Command**

```
pnpm --filter @voyago/api exec prisma migrate deploy && pnpm --filter @voyago/api start
```

Replace the autofilled `yarn start` — this repository does not use yarn, and
there is no start script at the root.

**Environment variables with fixed values**

```
NODE_ENV=production
NODE_VERSION=20.19.0
COREPACK_ENABLE_DOWNLOAD_PROMPT=0
JWT_ACCESS_TTL=900s
JWT_REFRESH_TTL=7d
THROTTLE_TTL_SECONDS=60
THROTTLE_LIMIT=120
AUTH_THROTTLE_LIMIT=10
LOG_LEVEL=info
```

**Secrets you supply**

`DATABASE_URL`, `DIRECT_URL`, `MONGODB_URI`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, `CORS_ORIGINS`.

Render injects `PORT` itself; do not set it.

**Quicker:** the Environment Variables panel has an **Add from .env** button.
Paste one block covering every variable above rather than adding them one at a
time. Add them before the first deploy — the API validates its configuration at
boot and exits on anything missing.
