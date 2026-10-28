# Voyago — Architecture

This document records the significant technical decisions behind Voyago, why each was made,
and what the trade-offs are.

---

## 1. Scope

The platform is designed for six travel services: hotels, flights, activities, holiday
packages, car rentals, and the shared account, payment and admin layer beneath them.

**Only the hotel service is implemented.** It is built as the reference implementation: a
complete, tested vertical slice that defines the booking, pricing, payment and refund patterns
the remaining services will reuse. The others are deliberately absent rather than stubbed —
placeholder pages that do nothing would misrepresent the project's state.

---

## 2. Repository layout

A **pnpm workspace monorepo**. The frontend and backend share money arithmetic, pricing rules,
cancellation-policy evaluation and DTO types; duplicating those across two repositories would
guarantee they drift.

```
apps/web          Next.js frontend
apps/api          NestJS backend
packages/shared   @voyago/shared — pure, dependency-free domain logic
infrastructure    Docker Compose
e2e               Playwright specs (span both apps, so they live at the root)
docs              this documentation
```

`packages/shared` has **no runtime dependencies**. It compiles to CommonJS and is consumed by
both apps. Keeping it pure means its pricing and policy logic is trivially unit-testable and
can run identically on the server and in the browser.

**Trade-off:** a monorepo means one `pnpm install` pulls dependencies for everything, and the
shared package must be built before either app will type-check. That cost is small next to the
correctness benefit of a single pricing implementation.

---

## 3. Stack and versions

| Layer         | Choice             | Version | Why                                                                                                                       |
| ------------- | ------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| Frontend      | Next.js App Router | 15.5.28 | Server Components keep API tokens and data fetching on the server; file-based routing matches the URL-driven search model |
| UI            | React              | 19.1.10 | `useActionState` gives progressive-enhancement forms with pending state and no client-side fetch layer                    |
| Styling       | Tailwind CSS       | 3.4.19  | Design tokens in one config; v3 rather than v4 for ecosystem stability                                                    |
| Backend       | NestJS             | 11.2.8  | Module boundaries, DI, declarative validation and first-class OpenAPI                                                     |
| ORM           | Prisma             | 6.19.3  | Typed queries, a real migration history, and a schema that doubles as documentation                                       |
| Primary DB    | PostgreSQL         | 16      | Transactions, foreign keys and constraints for anything involving money                                                   |
| Document DB   | MongoDB            | 7       | Editorial content and append-only snapshots                                                                               |
| Language      | TypeScript         | 5.9.3   | `strict` everywhere                                                                                                       |
| Unit tests    | Jest               | 29.7    |                                                                                                                           |
| API tests     | Supertest          | 7.3     |                                                                                                                           |
| Browser tests | Playwright         | 1.56    |                                                                                                                           |

**Versions were pinned exactly, not floated.** Next 16, NestJS 12, Prisma 8 and TypeScript 7
were all available but are too new for the surrounding ecosystem's type definitions; a
portfolio project that will not build in six months is worthless.

---

## 4. Backend: a modular monolith

One deployable process, with strict module boundaries inside it:

```
auth           registration, login, refresh-token rotation
users          profile and password management
destinations   city catalogue and resolution
hotels         search, facets, sorting, detail composition
availability   THE pricing and inventory authority; issues quotes
bookings       booking lifecycle and the state machine
payments       the demo payment simulator
admin          dashboard metrics and inventory management
content        MongoDB access (editorial content, pricing snapshots)
health         liveness and readiness probes
```

No microservices, no message broker, no Redis, no Kubernetes. None of them is justified at this
scale, and each would add operational surface without improving the demo. If the services in
section 1 are all built, `availability` and `bookings` are the modules most likely to warrant
extraction — they are already the only two that hold shared state.

### Why `availability` is separate from `hotels`

`availability` is the single authority on two questions: _can this room be sold for these
dates?_ and _what does it cost?_ `hotels` composes search results and detail pages but delegates
both answers. Keeping that boundary sharp is what makes it impossible for a presentation
concern to accidentally invent a price.

---

## 5. Money

**Every monetary value is an integer number of minor units (paise).** There is no floating-point
arithmetic anywhere in the pricing path, and no `Decimal` type in the application layer either —
integers are simpler and sufficient.

The demo currency is **INR** throughout, consistently in the API, the database and the UI.

`packages/shared/src/money.ts` provides:

- `toMinorUnits` / `toMajorUnits` — conversion at the boundaries only
- `applyBasisPoints` — percentages as integer basis points, rounded half away from zero
- `roundToMajorUnit` — derived amounts (tax, discount, supplements) are settled to the whole
  rupee, as Indian hotel invoices are

Because the room tariff is seeded in whole rupees and every derived amount is rounded to the
rupee, **totals are always whole rupees and the price breakdown always sums exactly to the
total.** That last property is asserted in both the unit and integration suites.

---

## 6. Pricing model

```
room tariff        = Σ(nightly rate) × rooms
+ supplement       = rate-plan premium for meals or flexibility (basis points)
= base
− discount         = promotional discount (basis points of base)
= taxable
+ GST              = slab-based: 12% at or below ₹7,500/night, otherwise 18%
+ service fee      = flat ₹199 per booking
= total
```

`computePrice` is a **pure function** in `packages/shared`. The API calls it; the browser never
does. The frontend renders `price.lines[]` exactly as the server produced them, so there is no
second implementation that can disagree.

Rate plans differ along two axes — inclusions (meal plan) and flexibility (cancellation policy)
— and both are priced. A non-refundable room-only saver is 12% below the tariff; a
half-board rate with partial refundability carries a 26% supplement. Without this, every rate
plan on a room would cost the same, which is neither realistic nor a useful demonstration.

---

## 7. Inventory and holds

`RoomInventory` carries one row per room type per date: `roomsOpen` and `baseRateMinor`.

Availability for a stay is:

```
available(night) = roomsOpen
                 − rooms held by bookings in an inventory-holding status
                 − rooms held by unexpired, unconsumed quotes
```

Inventory-holding booking statuses are `PENDING_PAYMENT`, `PAYMENT_PROCESSING`,
`PAYMENT_FAILED`, `CONFIRMED` and `CANCELLATION_REQUESTED`. A failed payment keeps its hold so
the customer can retry without losing the room.

**Quotes act as soft holds.** Creating a quote writes a row with a 20-minute expiry; while it
lives, it subtracts from availability for everyone else. Re-reading a quote excludes its own
hold so it does not block itself.

**Trade-off:** this is a database-row hold, not a distributed lock. Two simultaneous bookings
for the last room are resolved by re-checking availability inside the booking transaction — the
loser gets a `409 Conflict` with a clear message. That is correct, but it resolves the race at
commit time rather than preventing it. At real concurrency this would want a stronger mechanism
(`SELECT … FOR UPDATE` on the inventory rows, or a reservation table with a unique constraint).

---

## 8. The booking state machine

```
PENDING_PAYMENT ──► PAYMENT_PROCESSING ──► CONFIRMED ──► CANCELLATION_REQUESTED ──► CANCELLED
       │                     │                  │                                      ▲
       │                     ▼                  └──────────────────────────────────────┘
       │              PAYMENT_FAILED ──► PAYMENT_PROCESSING (retry)
       ▼                     │
   CANCELLED / EXPIRED ◄─────┘
```

Transitions are declared once, in `packages/shared/src/enums.ts`, and validated by
`canTransition` on **every** state change. `CANCELLED` and `EXPIRED` are terminal.

Three properties follow, and all three are tested:

1. A booking cannot reach `CONFIRMED` without passing through `PAYMENT_PROCESSING`.
2. A terminal booking cannot be reopened.
3. Every transition writes a `BookingStatusEvent`, so the history is complete and auditable.

---

## 9. Payment simulation

The simulator never contacts a gateway, never accepts card details, and never moves money.

`POST /bookings/:ref/payments` takes **only** a scenario name and an idempotency key. The
server derives the outcome:

| Scenario  | Booking              | Payment     |
| --------- | -------------------- | ----------- |
| `SUCCESS` | `CONFIRMED`          | `SUCCEEDED` |
| `FAILURE` | `PAYMENT_FAILED`     | `FAILED`    |
| `PENDING` | `PAYMENT_PROCESSING` | `PENDING`   |

A pending payment is finished through `POST /bookings/:ref/payments/resolve`.

**A client cannot mark a booking as paid.** It cannot send `status`, `paymentStatus` or
`totalMinor` — the global `ValidationPipe` runs with `forbidNonWhitelisted: true`, so unknown
properties are a `400`, not a silent ignore. This is the primary defence against mass
assignment and is covered by an explicit test.

**Idempotency** is enforced by a unique constraint on `PaymentAttempt.idempotencyKey`. Replaying
a key returns the original attempt and the current booking, unchanged — even if the replay asks
for a different scenario. The frontend generates one key per rendered payment form, so a double
submit or a refresh-and-resubmit is absorbed.

---

## 10. Cancellation and refunds

A `CancellationPolicy` is an ordered set of tiers: _cancel at least N hours before check-in and
P basis points are retained._ `evaluateCancellation` picks the first tier the request still
qualifies for.

Two rules make this behave like a real booking system rather than a demo that always refunds:

- A **non-refundable** rate can still be cancelled — it simply returns a zero refund.
- A booking that was **never paid** refunds nothing regardless of policy; its refund status is
  `NOT_APPLICABLE`, not `REFUNDED`.

The policy is **snapshotted onto the booking** at creation time, so later edits to the rate plan
cannot retroactively change what a customer agreed to.

---

## 11. Snapshots and immutability

Three things are frozen onto every booking at creation:

- `priceSnapshot` — the complete breakdown, line by line
- `cancellationPolicySnapshot` — the policy exactly as presented
- `hotelSnapshot` — name, address, contact and check-in times

A booking therefore reads back correctly even if the hotel is renamed, the rate plan is
retired, or prices move. This is why the booking detail page and voucher never join back to
live inventory.

---

## 12. Two databases, and why

| Data                                                                                            | Store      | Reason                                                                                                           |
| ----------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| Users, hotels, rooms, rate plans, inventory, quotes, bookings, guests, payments, refunds, audit | PostgreSQL | Needs transactions, foreign keys, unique constraints and a consistent view of money                              |
| Destination editorial content                                                                   | MongoDB    | Free-form, nested, revised on a different cadence by different people, never in a transaction                    |
| Supplier/pricing snapshots                                                                      | MongoDB    | Append-only, shape varies, written outside the booking transaction so a logging failure can never fail a booking |

**No transactional data is duplicated across the two.** MongoDB holds nothing the booking flow
depends on: if it is unavailable, `ContentService` logs a warning and returns `null`, hotel
pages render without their destination guide, and bookings continue to work. That degradation
is deliberate and is why content reads are wrapped in `try/catch` rather than allowed to throw.

**Honest assessment:** a single PostgreSQL instance with `jsonb` columns would also serve this
dataset. MongoDB is here because the brief asked for it where it adds value, and because
append-only snapshots of varying shape are a genuinely reasonable document-store use. It is not
load-bearing, and removing it would cost two features, not the product.

---

## 13. Authentication and sessions

- **Passwords**: bcrypt, 12 rounds. Never logged, never returned.
- **Access tokens**: JWT, 15-minute lifetime, sent as `Authorization: Bearer`.
- **Refresh tokens**: JWT, 7-day lifetime. Only a SHA-256 **hash** is stored. Rotated on every
  use — the presented token is revoked as the new pair is issued. Changing a password revokes
  every outstanding session.
- **Cookie handling**: the Next.js server writes both tokens into `httpOnly`, `sameSite=lax`
  cookies (`secure` in production). **Browser JavaScript can never read them**, which removes
  the usual XSS token-theft path. Server Components and server actions read the cookie and
  forward it as a bearer token.
- **Login responses are uniform**: an unknown email and a wrong password return the identical
  message, and a comparable amount of work is done in both cases, so the endpoint cannot be used
  to enumerate accounts.

### Authorization

`JwtAuthGuard` is global; routes opt out with `@Public()`. `RolesGuard` enforces `@Roles('ADMIN')`.

**Ownership is enforced in the service layer, not the controller**, so every caller is covered.
Requesting another customer's booking returns **404, not 403** — a 403 would confirm the
reference exists, which is itself a disclosure.

### Other measures

- `helmet` security headers; CORS restricted to configured origins
- Rate limiting globally, tightened on login and registration via `AUTH_THROTTLE_LIMIT`
  (default 10/minute; raised only in local and CI environments)
- Centralised exception filter — **stack traces and internal messages never reach a client**
- Environment validated at boot; the app refuses to start on weak configuration
- No secrets in source or in git history; `.env.example` holds placeholders only

---

## 14. Frontend decisions

**Server Components by default.** Pages fetch on the server, so API tokens stay server-side and
there is no client-side data-fetching library to maintain. Client Components are used only
where interactivity demands it: the search form, filters, gallery, occupancy picker and the
action-driven forms.

**Search state lives in the URL.** Every filter, sort and page writes to the query string.
Results are shareable, the back button steps through filter changes correctly, and a refresh
restores exactly what the user was looking at. `parseSearchParams` _repairs_ rather than
rejects bad input — a past check-in is moved forward, an over-long stay is capped — so a stale
link degrades into a sensible search instead of an error.

**Server actions, not an API client in the browser.** Mutations run through `'use server'`
functions that call the API with the session cookie. The browser never holds a token and never
constructs an API request.

**Duplicate submissions are prevented** by `useActionState`'s pending flag disabling the
submit button, and absorbed server-side by the idempotency key.

### Design system

Original Voyago branding: deep ocean teal (`brand`), sunset coral accent (`coral`) and a warm
sand background. Tokens live in `tailwind.config.ts`; component primitives in
`src/components/ui`. Accessibility basics are built in — a skip link, visible focus rings on
every interactive element, labelled form controls with `aria-invalid` and `aria-describedby` on
errors, a keyboard-navigable combobox, and semantic landmarks.

---

## 15. Error handling and observability

- One documented error envelope from every endpoint: `statusCode`, `error`, `message`,
  optional `details`, `requestId`, `timestamp`, `path`
- Validation failures return field-level `details`; the UI maps them onto inputs
- A `requestId` is generated per request, returned in the `x-request-id` header and included in
  every log line and error body
- Structured JSON access logs; **request bodies are never logged**, so passwords, tokens and
  guest details stay out of the log stream
- `/health` for liveness, `/health/ready` for readiness including both databases

---

## 16. Testing strategy

| Level       | Tool             | What it proves                                                                                                                    |
| ----------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | Jest             | Pricing arithmetic, GST slabs, cancellation tiers, state-machine rules, token and password handling, URL parsing, form validation |
| Integration | Jest + Supertest | Real HTTP through the real Nest app against the real PostgreSQL and MongoDB                                                       |
| Browser     | Playwright       | The complete customer journey, including failure paths, in a real browser                                                         |

Nothing is mocked at the database boundary. The integration suite boots the actual
`AppModule` with the same pipes and filters as production.

**Tests spread their stay windows across dates.** Because quotes hold inventory, a suite that
reused one date range would exhaust the room and fail for the wrong reason. Helpers also walk
forward past deliberately seeded sell-outs rather than asserting on inventory that may not be
there — the alternative is a flaky suite, which is worse than no suite.

---

## 17. What is deliberately absent

| Not built                                  | Why                                                                                     |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| Real payment integration                   | The brief requires simulation only                                                      |
| Email or SMS delivery                      | No value in a demo; a confirmation page and voucher serve the purpose                   |
| A scheduler to expire unpaid bookings      | Expiry is enforced on the next payment attempt; a cron job is a small isolated addition |
| Redis, message brokers, microservices      | No demonstrated need at this scale                                                      |
| Multi-currency                             | One documented demo currency is clearer and matches the brief                           |
| Flights, packages, activities, car rentals | Out of scope for this milestone by design                                               |
