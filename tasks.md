# Voyago — deliverable checklist

A task is ticked only when its acceptance criteria were **verified by running it**. Anything
not verified is listed as outstanding at the bottom, not ticked.

Last verified: 29 October 2026.

---

## Phase A — Repository and environment

- [x] Inspect the working directory, Git state and remote
- [x] Confirm Node 20.20.2, pnpm 10.34.5, Docker 29.6.2, PostgreSQL client 18.4
- [x] Confirm the GitHub remote is reachable and empty (`git ls-remote` returned no refs)
- [x] Initialise Git on `main` and add the `origin` remote
- [x] Preserve existing work — the directory was empty, so nothing was overwritten

## Phase B — Architecture and configuration

- [x] pnpm workspace monorepo: `apps/web`, `apps/api`, `packages/shared`
- [x] Pin exact, mutually compatible dependency versions
- [x] TypeScript `strict` across all three packages
- [x] Prettier and ESLint configured; `pnpm -r lint` passes clean
- [x] `.gitignore` covering env files, build output, test artefacts and secrets
- [x] `.env.example` with placeholders only
- [x] Environment validated at boot; the API refuses to start on weak configuration
- [x] Docker Compose for PostgreSQL 16 and MongoDB 7 on non-default ports
- [x] Document decisions in `docs/architecture.md`

## Phase C — Running stack

- [x] PostgreSQL and MongoDB containers start and report healthy
- [x] Prisma schema, migrations and generated client
- [x] API boots and connects to both databases
- [x] `/health` and `/health/ready` report both databases `up`
- [x] Swagger served at `/api/docs` in development only
- [x] Next.js frontend builds and serves
- [x] Seed loads 6 destinations, 25 hotels, 69 room types, 16,560 inventory nights
- [x] Seed loads 6 MongoDB destination guides
- [x] Clean initialisation verified from destroyed volumes

## Phase D — Search, detail and price recheck

- [x] Destination list and autocomplete
- [x] Hotel search returning real seeded records through the API
- [x] Date, occupancy and stay-length validation on both client and server
- [x] Filters on price, star rating, amenities, meal plan and free cancellation
- [x] Sorting by relevance, price and guest rating
- [x] Pagination with non-overlapping pages
- [x] Facet counts derived from the result set
- [x] URL-backed search state; reload and back/forward behave correctly
- [x] Loading skeletons, empty states and error states
- [x] Hotel detail with gallery, amenities, policies and MongoDB content
- [x] Room and rate-plan offers with occupancy, meal plan and cancellation policy
- [x] Server-side price recheck issuing a quote with a 20-minute inventory hold
- [x] Client-supplied prices rejected (unknown properties return 400)

## Phase E — Checkout and demo payments

- [x] Authentication required before checkout, with return-to redirect
- [x] Guest and contact validation, email and phone format enforced
- [x] Special requests, capped and optional
- [x] Cancellation-policy acknowledgement required
- [x] Booking persisted in `PENDING_PAYMENT` with an immutable price snapshot
- [x] Unique `VYG-XXXXXXXX` booking reference
- [x] Quote consumed on use; a replayed submit returns the same booking
- [x] Payment simulator with success, failure and pending scenarios
- [x] Server-side state transitions; a client cannot mark a booking paid
- [x] Idempotency key enforced by a unique constraint
- [x] Demo-payment disclaimer on every payment surface

## Phase F — Confirmation, account and refunds

- [x] Confirmation generated from verified server state
- [x] Booking history listing persisted records
- [x] Booking detail with status timeline and payment attempts
- [x] Printable voucher marked as not a valid travel document
- [x] Pending payments resolvable to success or failure
- [x] Safe retry after a failed payment
- [x] Cancellation validated against the snapshotted policy
- [x] Refund simulation: full, partial, rejected and not-applicable outcomes
- [x] Refund records persisted and surfaced to the customer and admin
- [x] Registration, login, profile editing and password change
- [x] Ownership enforced server-side; another user's booking returns 404

## Phase G — Admin dashboard

- [x] Admin role enforced by a server-side guard
- [x] Overview metrics computed from the database, not hardcoded
- [x] Booking list with status and free-text filters
- [x] Booking inspection bypassing the ownership check
- [x] Hotel inventory list and per-hotel detail
- [x] Room and rate-plan visibility
- [x] Bulk availability and nightly-rate editing over a date range
- [x] Refund records with their policy reason
- [x] Audit log of administrative changes

## Phase H — Testing, quality and builds

- [x] 37 API unit tests — money, GST slabs, pricing, policies, state machine, auth helpers
- [x] 31 web unit tests — URL parsing, search validation, autocomplete, occupancy rules
- [x] 58 API integration tests against real PostgreSQL and MongoDB
- [x] 38 Playwright tests across desktop and mobile projects
- [x] Authorization and duplicate-request protection covered by tests
- [x] `pnpm -r lint` passes with no errors
- [x] `pnpm -r typecheck` passes with no errors
- [x] `pnpm format:check` passes
- [x] API and web production builds succeed

## Phase I — Documentation, Git and deployment

- [x] `README.md` — prerequisites, setup, env, seeding, commands, testing, limitations
- [x] `docs/architecture.md`
- [x] `docs/database-design.md`
- [x] `docs/api-contracts.md`
- [x] `docs/deployment.md`
- [x] `tasks.md` (this file)
- [x] GitHub Actions workflow covering lint, types, unit, integration, builds and Playwright
- [x] Repository reviewed for secrets before committing
- [ ] **Pushed to GitHub** — awaiting explicit approval; the exact command is in the final report
- [x] Free-tier deployment configuration: `render.yaml`, `apps/web/vercel.json`, keep-warm workflow
- [x] Platform `PORT` honoured; API client handles a sleeping service with a clear message
- [ ] **Deployed publicly** — blocked on hosting accounts; the stack itself costs nothing

---

## Phase J — Deployment (29 October 2026)

- [x] Pushed to GitHub; CI green including Playwright-in-container e2e
- [x] API deployed to Vercel serverless (`voyago-api-rose.vercel.app`), health and readiness verified
- [x] Web deployed to Vercel (`travel-platform-development-orcin.vercel.app`)
- [x] Neon Postgres migrated and seeded; Atlas M0 seeded; both verified by row counts
- [x] CORS locked to the exact frontend origin and verified (foreign origins get no allow-origin)
- [x] A full booking journey executed against production: search → quote → login → guest
      details → demo payment → confirmed → cancelled with policy-correct zero refund

## Phase K — QA hardening (29 October 2026)

- [x] 80-case adversarial API audit harness (`scripts/qa-api-audit.mjs`), all passing
- [x] Fixed: admin hotel PATCH validated (runtime `Partial<>` erasure), malformed-UUID 500s,
      voucher gating, money formatting, filter/select accessibility, contrast token,
      heading order, favicon — full details in `docs/qa-audit.md`
- [x] Loading skeletons for the dynamic routes that can safely stream (self-revalidating
      action segments excluded - see D9 in `docs/qa-audit.md`)
- [x] Full regression at head: 38 + 31 unit, 59 integration, 40 Playwright, 80 harness

## Phase L — Flight service (29 October 2026)

- [x] Ten flight tables mirroring the hotel patterns (quotes, bookings, payments, refunds,
      status events) on the shared enums and cancellation policies; migration applied
- [x] Shared fare engine: computeFarePrice (5%/12% demo GST by cabin, exact-sum lines),
      schedule helpers, view types - 8 unit tests
- [x] Seeded a fictional 48-flight network: 4 airlines, 6 airports, 124 fare classes,
      ~30k per-date inventory rows, one shared base fare per flight-date
- [x] API: /flights/search + airports, /flight-quotes (20-minute seat holds, recheck),
      /flight-bookings (VYF refs, snapshots, passenger-count enforcement), payment simulator
      twin, fare-rule cancellation - 16 integration tests
- [x] Web: home Hotels/Flights tabs, results with fare families, passenger checkout, shared
      payment/detail/e-ticket/cancellation surfaces routed by reference prefix, merged
      bookings list - 4 Playwright tests
- [x] Harness extended to 96 cases; caught and fixed a party-size 500

## Outstanding, and why

| Item                                | Status    | Blocker                                                                               |
| ----------------------------------- | --------- | ------------------------------------------------------------------------------------- |
| Scheduled expiry of unpaid bookings | Not built | Enforced on the next payment attempt instead; a cron job is a small isolated addition |

## Deliberately out of scope

Flights, holiday packages, activities and car rentals. The hotel service is the first
functional milestone and defines the patterns the rest will reuse; see `/roadmap` in the app
and section 17 of `docs/architecture.md`.
