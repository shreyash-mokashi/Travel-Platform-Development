# Voyago

A portfolio-grade online travel booking platform. The **hotel and flight booking services are
complete end to end** — search, fare/rate selection, server-side price recheck, persisted
bookings, a demo payment simulator, vouchers and e-tickets, and policy-driven cancellation and
refund simulation — on an architecture designed so packages, activities and car rentals can be
added without a rewrite. The flight service was added exactly that way: its own tables and
modules on the shared state machine, payments and policy engine.

> **This is a demonstration project.** All hotel and flight inventory is seeded sample data (every airline is fictional) and does not
> represent real properties or live supplier availability. All payments and refunds are
> simulated: no payment gateway is contacted, no card details are ever collected, and no money
> moves.

**Live demo:** [travel-platform-development-orcin.vercel.app](https://travel-platform-development-orcin.vercel.app)
· API: [voyago-api-rose.vercel.app/api/v1/health](https://voyago-api-rose.vercel.app/api/v1/health)
— both run on free serverless tiers (Vercel + Neon + MongoDB Atlas), so the first request
after a quiet period can take a few seconds while the functions and databases wake up.

---

## Contents

- [What is built](#what-is-built)
- [Architecture at a glance](#architecture-at-a-glance)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment configuration](#environment-configuration)
- [Database setup and demo data](#database-setup-and-demo-data)
- [Running the applications](#running-the-applications)
- [Demo accounts](#demo-accounts)
- [Testing](#testing)
- [Command reference](#command-reference)
- [Project structure](#project-structure)
- [Documentation](#documentation)
- [Known limitations](#known-limitations)

---

## What is built

| Area                                                              | Status                       |
| ----------------------------------------------------------------- | ---------------------------- |
| Hotel search with filters, sorting, pagination and facets         | Complete                     |
| Hotel detail with gallery, amenities, rooms and rate plans        | Complete                     |
| Server-side price recheck with a soft inventory hold              | Complete                     |
| Guest checkout with persisted bookings and price snapshots        | Complete                     |
| Demo payment simulator (success / failure / pending / retry)      | Complete                     |
| Booking confirmation, history and printable voucher               | Complete                     |
| Cancellation and refund simulation driven by the booked policy    | Complete                     |
| Customer accounts, profile and session management                 | Complete                     |
| Admin dashboard: metrics, bookings, inventory, refunds, audit log | Complete                     |
| Flights, packages, activities, car rentals                        | Not started — see `/roadmap` |

---

## Architecture at a glance

```
apps/web      Next.js 15 (App Router) + React 19 + Tailwind CSS 3
apps/api      NestJS 11 modular monolith + Prisma 6
packages/     @voyago/shared — money, pricing, policy and DTO types used by both
infrastructure Docker Compose: PostgreSQL 16 + MongoDB 7
```

- **PostgreSQL** holds everything transactional: users, hotels, rooms, rate plans, nightly
  inventory, quotes, bookings, guests, payment attempts, refunds and audit logs.
- **MongoDB** holds destination editorial content and append-only pricing snapshots — document
  shaped data that is revised independently of the booking schema and never participates in a
  transaction. See [docs/architecture.md](docs/architecture.md) for the full rationale.
- **Money is never a float.** Every amount is an integer number of paise. The demo currency is
  INR throughout.
- **The browser never decides a price.** Totals are recomputed by the API at quote time and
  again at booking time.

Full decisions and trade-offs: **[docs/architecture.md](docs/architecture.md)**.

---

## Prerequisites

| Tool             | Version        | Notes                                                        |
| ---------------- | -------------- | ------------------------------------------------------------ |
| Node.js          | 20.11 or newer | Tested on 20.20.2                                            |
| pnpm             | 10.x           | `corepack enable && corepack prepare pnpm@latest --activate` |
| Docker + Compose | v2             | For PostgreSQL and MongoDB                                   |
| Git              | 2.x            |                                                              |

No globally installed database is required — the Compose stack provides both.

---

## Quick start

From a clean checkout, this brings the whole platform up:

```bash
# 1. Install dependencies
pnpm install

# 2. Create local environment files from the template
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local

# 3. Start PostgreSQL and MongoDB
pnpm infra:up

# 4. Apply migrations and load demo data
pnpm db:deploy
pnpm db:seed          # prints the demo account passwords once

# 5. Build the shared package, then run both apps
pnpm --filter @voyago/shared build
pnpm dev
```

Then open:

| Service           | URL                                         |
| ----------------- | ------------------------------------------- |
| Web application   | <http://localhost:3000>                     |
| API               | <http://localhost:4000/api/v1>              |
| Swagger / OpenAPI | <http://localhost:4000/api/docs>            |
| Health check      | <http://localhost:4000/api/v1/health/ready> |

> `pnpm db:seed` prints the seeded demo passwords to the terminal. They are not written to any
> file and are not displayed anywhere in the UI.

---

## Environment configuration

`.env.example` at the repository root is the single template for all three environment files.
It contains **placeholders only** — real `.env` files are git-ignored.

### `apps/api/.env`

| Variable                                  | Purpose                                              | Local default                                 |
| ----------------------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| `NODE_ENV`                                | Runtime mode                                         | `development`                                 |
| `API_PORT`                                | API listen port                                      | `4000`                                        |
| `DATABASE_URL`                            | PostgreSQL connection string                         | `postgresql://voyago:…@localhost:5434/voyago` |
| `MONGODB_URI`                             | MongoDB connection string                            | `mongodb://localhost:27018/voyago_content`    |
| `JWT_ACCESS_SECRET`                       | Access-token signing key (min 24 chars)              | — generate it                                 |
| `JWT_REFRESH_SECRET`                      | Refresh-token signing key, must differ in production | — generate it                                 |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL`      | Token lifetimes                                      | `900s` / `7d`                                 |
| `CORS_ORIGINS`                            | Comma-separated allowed origins                      | `http://localhost:3000`                       |
| `THROTTLE_TTL_SECONDS` / `THROTTLE_LIMIT` | Rate limiting window and budget                      | `60` / `300`                                  |
| `SEED_DEMO_*_PASSWORD`                    | Optional fixed demo passwords; random if unset       | unset                                         |

Generate strong secrets with:

```bash
openssl rand -base64 48
```

The API **validates its environment at boot** and refuses to start on missing or weak
configuration, rather than falling back to an insecure default.

### `apps/web/.env.local`

| Variable               | Purpose                                                  |
| ---------------------- | -------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`  | Browser-visible API base URL                             |
| `API_INTERNAL_URL`     | Server-side API base URL used by React Server Components |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL, used for metadata                    |

### Database ports

The Compose stack deliberately uses **non-default host ports** (PostgreSQL `5434`, MongoDB
`27018`) so it can coexist with other local databases. Change them in `infrastructure/.env`.

---

## Database setup and demo data

```bash
pnpm infra:up        # start PostgreSQL + MongoDB
pnpm db:deploy       # apply migrations (production-safe)
pnpm db:migrate      # create a new migration during development
pnpm db:seed         # load demo inventory and accounts
pnpm db:reset        # drop, re-migrate and re-seed
pnpm infra:reset     # destroy the volumes and start completely fresh
```

The seed creates:

- **6 destinations** — Mumbai, Pune, Goa, Bengaluru, Delhi and Jaipur
- **25 hotels** across 2 to 5 star classes, with images, amenities and policies
- **69 room types** with 3 to 4 rate plans each (meal plans and cancellation policies)
- **~16,500 nights of inventory** over 240 days, with weekend pricing and some deliberate
  sell-outs so "no availability" states are reachable
- **4 cancellation policies** — free, flexible, partially refundable and non-refundable
- **3 demo users** — a customer, an administrator and a second customer used by the
  authorization tests
- **6 MongoDB destination guides**

Seed data is deterministic: the same seed produces the same catalogue every time.

Verify a clean initialisation at any time with:

```bash
pnpm infra:reset && pnpm db:deploy && pnpm db:seed
```

---

## Running the applications

```bash
pnpm dev                              # both apps in watch mode
pnpm --filter @voyago/api dev         # API only, port 4000
pnpm --filter @voyago/web dev         # web only, port 3000
```

Production builds:

```bash
pnpm --filter @voyago/shared build
pnpm --filter @voyago/api build && pnpm --filter @voyago/api start
pnpm --filter @voyago/web build && pnpm --filter @voyago/web start
```

---

## Demo accounts

The seed creates two accounts for local development:

| Role          | Email                       |
| ------------- | --------------------------- |
| Customer      | `demo.customer@voyago.test` |
| Administrator | `demo.admin@voyago.test`    |

**Passwords are printed once by `pnpm db:seed`** and are not stored in the repository, shown in
the UI, or committed anywhere. To choose them yourself, set `SEED_DEMO_CUSTOMER_PASSWORD` and
`SEED_DEMO_ADMIN_PASSWORD` in `apps/api/.env` before seeding. If those variables are unset the
seed generates random passwords — which is the intended behaviour for any non-local
environment.

You can also register a fresh customer account through the UI at any time.

---

## Testing

All test commands run against the real application and the seeded database — nothing is
stubbed at the database boundary.

```bash
# Unit tests (pricing, policies, state machine, auth helpers, UI components)
pnpm test

# API integration tests (HTTP through the real Nest app and PostgreSQL + MongoDB)
pnpm --filter @voyago/api test:e2e

# Playwright browser tests — the stack must be running first
pnpm e2e:install          # one-time browser download
pnpm e2e                  # headless
pnpm e2e:ui               # interactive
```

### What is covered

| Suite           | Count      | Covers                                                                                                                                                                                                 |
| --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API unit        | 37         | Money arithmetic, GST slabs, price composition, cancellation tiers, booking transitions, token and password handling                                                                                   |
| Web unit        | 31         | Search-parameter parsing and repair, URL round-tripping, search form validation, autocomplete, occupancy rules                                                                                         |
| API integration | 58         | Registration, login, token rotation, role enforcement, search validation and filtering, quotes, booking creation, payment scenarios, idempotency, authorization, cancellation and refunds, persistence |
| Playwright      | see `e2e/` | The full customer journey in a browser, including failed and pending payments, retry, cancellation, cross-user access, refresh persistence, mobile flow and the admin dashboard                        |

Playwright specs run serially (`workers: 1`) because bookings consume shared seeded inventory.

Two environment settings matter when running the suites:

- **`AUTH_THROTTLE_LIMIT`** defaults to 10 sign-ins or sign-ups per minute, which is the right
  production posture but far below what a browser suite needs from a single host. The local
  `.env` raises it; keep the default in production.
- **Quotes hold inventory for 20 minutes**, so the test helpers spread their stay windows
  across dates and walk forward past sold-out nights rather than reusing one date range.
- **`SEED_DEMO_ADMIN_PASSWORD`** must be set to the value the seed printed for the admin
  Playwright specs to run. Without it those five tests skip with an explanatory message rather
  than failing — the password is never committed.

---

## Command reference

| Task                           | Command                              |
| ------------------------------ | ------------------------------------ |
| Install                        | `pnpm install`                       |
| Start databases                | `pnpm infra:up`                      |
| Stop databases                 | `pnpm infra:down`                    |
| Destroy and recreate databases | `pnpm infra:reset`                   |
| Apply migrations               | `pnpm db:deploy`                     |
| Create a migration             | `pnpm db:migrate`                    |
| Seed demo data                 | `pnpm db:seed`                       |
| Reset the database             | `pnpm db:reset`                      |
| Run both apps                  | `pnpm dev`                           |
| Build everything               | `pnpm build`                         |
| Type-check                     | `pnpm typecheck`                     |
| Lint                           | `pnpm lint`                          |
| Format                         | `pnpm format`                        |
| Unit tests                     | `pnpm test`                          |
| API integration tests          | `pnpm --filter @voyago/api test:e2e` |
| Install Playwright browsers    | `pnpm e2e:install`                   |
| Playwright tests               | `pnpm e2e`                           |

---

## Project structure

```
.
├── apps
│   ├── api                 NestJS modular monolith
│   │   ├── prisma          schema, migrations, seed scripts
│   │   ├── src
│   │   │   ├── common      filters, guards, interceptors, decorators
│   │   │   ├── config      environment validation
│   │   │   ├── modules     auth, users, destinations, hotels, availability,
│   │   │   │               bookings, payments, admin, content, health
│   │   │   └── prisma      Prisma client provider
│   │   └── test            HTTP integration tests
│   └── web                 Next.js App Router frontend
│       └── src
│           ├── app         routes (home, search, hotel, checkout, bookings, admin)
│           ├── components  design system and feature components
│           ├── lib         API client, session, server actions, URL parsing
│           └── styles      Tailwind layer definitions
├── packages/shared         money, pricing, cancellation, types
├── infrastructure          Docker Compose stack
├── e2e                     Playwright specs
├── docs                    architecture, database, API, deployment
└── tasks.md                deliverable checklist
```

---

## Documentation

| Document                                           | Contents                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------- |
| [docs/architecture.md](docs/architecture.md)       | Stack choices, module layout, pricing and inventory model, security posture |
| [docs/database-design.md](docs/database-design.md) | Tables, relationships, indexes, constraints, MongoDB collections            |
| [docs/api-contracts.md](docs/api-contracts.md)     | Every endpoint with request and response shapes and status codes            |
| [docs/deployment.md](docs/deployment.md)           | Hosting options, environment setup, step-by-step deployment                 |
| [tasks.md](tasks.md)                               | Deliverable checklist with verification status                              |

---

## Deployment

Voyago deploys **entirely on free tiers, with no card required**: both applications on Vercel
Hobby, PostgreSQL on Neon, MongoDB on Atlas M0. The API ships two entry points from one
configuration — a long-running server (`src/main.ts`) for local use, CI and any PaaS host, and
a cached serverless handler (`src/serverless.ts`) for Vercel functions.

Render was the original target and `render.yaml` is still in the repository, but Render now
requires card verification even when every service is free. The Render path is documented as
an alternative.

**It has not been deployed** — that needs accounts and credentials I do not have. The full
walkthrough, including what is left for you to do, is in
[docs/deployment.md](docs/deployment.md).

## Known limitations

These are deliberate scope boundaries for a demonstration project, not defects:

- **No real payments.** The payment simulator is the only payment path. There is no gateway
  integration and no card handling of any kind.
- **No email delivery.** Booking confirmations are shown in the UI and as a printable voucher;
  nothing is sent.
- **Only hotels are implemented.** The other travel services are architectural placeholders
  described on the `/roadmap` page.
- **Unpaid bookings are not expired by a scheduler.** A booking past its payment window is
  rejected on the next payment attempt, but no background job sweeps them. Adding one is a
  small, isolated change.
- **Inventory holds are soft.** A quote holds rooms for 20 minutes via a database row; there is
  no distributed lock, which is appropriate at this scale but would need revisiting under real
  concurrency.
- **Unknown hotel URLs render the not-found page with a 200 status.** Next.js streams every
  dynamic route, so the status line is flushed before `notFound()` is reached. The user sees
  the correct page; only the HTTP status is wrong. Fixing it properly would mean validating
  every slug in middleware, adding an API round-trip to every page load for a cosmetic gain.
- **Rate limiting weakens when the API runs as serverless functions.** `@nestjs/throttler`
  counts in memory and each instance has its own, so the limits bound one instance rather than
  a caller. A long-running host, or a shared throttler store, restores the intended behaviour.
- **Not production-ready.** The demo works end to end and is tested, but it has not been
  through load testing, a penetration test, or an accessibility audit.
