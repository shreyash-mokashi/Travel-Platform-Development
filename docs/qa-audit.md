# QA audit — hotel booking service

Date: 29 October 2026. Auditor: automated + exploratory pass driven end to end against the
running application and its databases. Every result below was produced by actually executing
the check; nothing is inferred.

## 1. Scope and method

- **Adversarial API audit** — `scripts/qa-api-audit.mjs`, a standalone harness that runs
  80 numbered cases against a live API and exits non-zero on any failure:

  ```bash
  node scripts/qa-api-audit.mjs                # defaults to http://localhost:4000
  node scripts/qa-api-audit.mjs https://my-api # any deployed instance
  ```

  Coverage: registration/login validation, token tampering, refresh rotation and replay,
  mass-assignment probes on every write endpoint, search parameter abuse, quote integrity
  (price recheck, cross-hotel id mixing, malformed UUIDs), booking authorization, payment
  idempotency and state transitions, cancellation policy, admin RBAC and validation,
  security headers and error envelopes. Each run registers throwaway users and books real
  rooms on randomized far-future dates, so it is safe to repeat.

- **Automated suites** (all green at head):
  | Suite | Count | Command |
  |---|---|---|
  | Shared/API unit (Jest) | 38 | `pnpm --filter @voyago/api test` |
  | Web unit (Jest) | 31 | `pnpm --filter @voyago/web test` |
  | API integration (Supertest, real DBs) | 59 | `pnpm --filter @voyago/api test:e2e` |
  | Browser e2e (Playwright, desktop + Pixel 7) | 38 | `SEED_DEMO_ADMIN_PASSWORD=... npx playwright test` |
  | Adversarial API audit | 80 | `node scripts/qa-api-audit.mjs` |

  Five of the seven admin e2e tests skip without `SEED_DEMO_ADMIN_PASSWORD` (the suite cannot know a
  generated password); they were executed with it and pass.

- **Exploratory browser QA** — manual walkthrough via browser automation at 375×812 (mobile
  emulation, touch) and 1440×900: navigation and menu, search widget guards, filters and
  facets, pagination, hotel detail and gallery, register/login validation, the full booking
  journey including FAILURE → retry → PENDING → resolve, voucher, cancellation, account,
  admin (overview, bookings, inventory editor with a real write, refunds, audit log),
  signed-out redirects, 404s, horizontal-overflow and tap-target checks on every page.

- **Database verification** — row-level checks in PostgreSQL after UI actions (inventory
  write landed with correct date semantics, audit rows appended, booking states transitioned);
  Mongo content collections verified; a data row corrupted by the audit itself (see D2) was
  repaired back to its seeded value and verified.

- **Lighthouse** (mobile, search results page — the most complex screen).

## 2. Defects found and fixed

| # | Severity | Defect | Root cause | Fix | Regression test |
|---|---|---|---|---|---|
| D1 | High (security) | `PATCH /api/v1/admin/hotels/:id` accepted any payload — `starRating: 11` persisted to the database | `@Body() dto: Partial<UpsertHotelDto>`: a bare TypeScript `Partial<>` is erased at runtime, so class-validator saw no rules and the whitelist could not strip fields | `UpdateHotelDto extends PartialType(UpsertHotelDto)` keeps every validator with optional fields | Audit cases ADM `starRating: 11` → 400, unknown field → 400 |
| D2 | — (data) | The D1 probe left an 11-star hotel in the local database | Consequence of D1 | Row restored to its seeded 4-star value and verified in the admin UI | — |
| D3 | High | `GET /quotes/:id`, quote creation and booking creation returned **HTTP 500** for malformed (non-UUID) ids | Prisma error `P2023` was unmapped in the global exception filter and ids were validated only as strings | `@IsUUID()` on all id fields, `ParseUUIDPipe` on `:id` params (quotes + all admin routes), and a `P2023 → 400` mapping in the filter as a safety net | Integration: three malformed-id cases expect 400; audit QT/ADM cases |
| D4 | Medium | Money rendered as `₹16,194.5` — one decimal digit — on every per-night price | `formatMoney` allowed 0–2 fraction digits, and per-night values rounded to whole paise are frequently half-rupees | Whole amounts render with no decimals, fractional with exactly two; additionally per-night prices are now rounded to whole rupees server-side (`roundToMajorUnit`), the way travel sites quote them | Unit: `formatMoney` fraction cases |
| D5 | Medium | The printable check-in **voucher rendered for unpaid bookings** (payment failed/pending), and every booking page linked to it | No status gate on the voucher route or the link | Both gated to `CONFIRMED`/`CANCELLATION_REQUESTED`; the voucher URL shows an explanatory empty state otherwise | Playwright: failure-path test asserts no link and a refusal at the URL |
| D6 | Low (a11y) | 18 filter checkboxes, the price slider and the sort select had no `id`/`name` (DevTools issue, breaks autofill/form semantics); facet counts were announced glued to the label (“5 star1”) | Markup gaps | Stable ids/names derived from the facet value; counts `aria-hidden` with a screen-reader `… properties` alternative | Lighthouse re-audit |
| D7 | Low (a11y) | `aria-label` on a `<span>` with no role (star rating) — prohibited ARIA; muted text at 4.28:1 contrast (needs 4.5); hotel-card headings skipped h1→h3 | Token `ink.muted #627D98` too light at 12px; missing `role="img"`; wrong heading level | `role="img"` on the rating, `ink.muted → #56708C` (5.1:1 white / 4.9:1 warm), card heading h3→h2 | Lighthouse re-audit |
| D8 | Low | No favicon — every page load 404ed on `/favicon.ico` (visible in prod logs) | Asset never created | `apps/web/src/app/icon.svg` brand mark | `curl /icon.svg` → 200 |

**Investigated, not defects:**

- Re-POSTing a consumed quote returns HTTP 201 with the *same* booking for its owner —
  deliberate idempotency for double-submits (`bookings.service.ts`); a different user gets 409.
  The audit now asserts “same reference, no duplicate” instead of expecting a rejection.
- The admin inventory editor appeared to give no feedback after applying a change; in fact the
  success alert renders inside the `<details>` element, which the probe had left collapsed. A
  real interaction (open → apply) shows “✓ Updated N night(s).” and keeps the panel open.

## 3. UX/polish added

- Shape-matched loading skeletons for the bookings list, destinations and both checkout
  steps. Three more were written and then **deliberately removed** after the e2e suite caught
  a regression (see D9): a loading boundary on a segment whose server actions revalidate that
  same segment and return `useActionState` feedback leaves the form stuck in its pending
  state, so `/admin`, `/account` and `/bookings/[reference]` ship without one. `hotels/[slug]`
  also has none, for a different documented reason: a loading boundary forces streaming,
  which would turn its `notFound()` into an HTTP 200.
- Footer links padded to meet minimum tap-target size on mobile.
- Favicon (D8).

### D10 — intermittent stuck "Cancelling…" on booking cancellation

Cancellation sometimes froze at its pending state while the server had already cancelled the
booking (database said CANCELLED; the captured response carried the full re-rendered page,
yet the client never applied it). Reproduced in manual QA and in repeated Playwright runs at
roughly a 1-in-10 rate. Three shapes of the server action were tried and **all still
flaked**: returning `useActionState` feedback after `revalidatePath`, redirecting after
revalidating, and a bare redirect. The common factor is submitting a React server action
from a page that was itself just reached through another action's redirect (`?justPaid=1`) -
the second action's response is intermittently dropped by the client-side action machinery.

Fix: cancellation no longer uses a server action at all. The form is a native HTML POST to a
route handler (`/bookings/[reference]/cancel`) that calls the API and answers with a 303
redirect to `?cancelled=1` or `?cancelError=…`, which the page renders server-side. A real
browser navigation cannot be dropped, and the form now also works without JavaScript.
Verified by stress-running the cancellation e2e tests in a loop (see §5a).

The suspect pattern (action feedback after revalidating its own segment) still exists in
`updateProfileAction` and `updateInventoryAction`; both have been exercised repeatedly
without failing, and they are listed under remaining known issues rather than silently
rewritten.

### D9 — a regression this audit introduced and caught

Adding `admin/loading.tsx` made the inventory editor hang at "Updating…": the apply action
calls `revalidatePath('/admin/hotels', 'layout')` and then returns its success message, and
with a loading boundary on the segment the returned state never reaches the form. The
Playwright admin suite failed on exactly the "Updated N night(s)" assertion, which is the
reason that assertion exists. The boundary was removed and the suite is green again; the
same pattern was removed pre-emptively from `/account` and `/bookings/[reference]`, whose
profile-update and cancel actions have the same revalidate-then-return shape.

## 4. What was verified working (no changes needed)

- Mobile layout: no horizontal scroll or viewport overflow on any audited page; collapsible
  nav with correct `aria-expanded`; filters collapsed by default behind a toggle.
- Search widget date guards (min/max, check-out floor follows check-in).
- Server-side price recheck and quote holds; expired/foreign/double-used quotes rejected.
- Payment state machine through the UI: FAILURE leaves the booking payable with a clear
  banner; PENDING shows a resolve panel; SUCCESS confirms; every transition appears in the
  booking timeline; idempotent replays return the original attempt.
- Cancellation honours the rate's policy (non-refundable saver → cancelled, zero refund,
  refund record REJECTED with the policy reason).
- RBAC end to end: anonymous → login redirect with `returnTo`; customer at `/admin` → denial
  page; API admin routes 401/403; owners cannot read, pay or cancel others' bookings.
- Admin screens compute from the database (booking counts and values moved with test runs),
  and inventory writes land in `room_inventory` with checkout-exclusive date semantics and an
  audit row.
- Register/login validation, including password-mismatch and duplicate-email paths, with
  proper `autocomplete` attributes throughout.
- Empty states (bookings list, voucher refusal) render helpful copy, not blank screens.

## 5. Lighthouse (mobile, search results)

| Category | Before | After |
|---|---|---|
| Accessibility | 91 | **100** |
| Best practices | 100 | 100 |
| SEO | 60 | 60 |

Reaching 100 also required demoting `ink-faint` (#9FB3C8, 2.15:1 on white) to the dark
footer where it belongs: all 27 light-background usages now use the AA-compliant `ink-muted`.

SEO is 60 by choice: the layout ships `noindex, nofollow` because the inventory is fabricated
demo data that must not end up in search results. Performance is not meaningfully measurable
on a local dev machine and is dominated by Vercel/Neon cold starts in production; see
README's cold-start note.

## 6. Remaining known issues

- `hotels/[slug]` has no loading skeleton (deliberate; documented above and in
  `docs/architecture.md`).
- Rate limiting on Vercel counts per serverless instance, not per caller
  (`docs/architecture.md` §13a).
- Unpaid bookings expire lazily (on the next payment attempt) rather than via a scheduled
  job — unchanged from the original design notes in `tasks.md`.
- `updateProfileAction` and `updateInventoryAction` keep the revalidate-then-return shape
  that D10 showed can race; neither has ever failed a run, but if either starts sticking in
  its pending state, the `?cancelled=1`-style redirect is the known fix.
- The five admin e2e tests require `SEED_DEMO_ADMIN_PASSWORD`; CI seeds a known value, so
  they run there.

## 7. Verdict

All 246 executed checks pass at head (80 harness + 38 + 31 + 59 + 38 automated + the
exploratory walkthrough). Three genuine defects of real consequence (admin write validation,
500s on malformed ids, voucher for unpaid bookings) were found, fixed at the root, and are
covered by regression tests. The hotel service is in a state I would call release-quality
**as a demo**: honest about simulation, hard to break from the outside, and consistent on
mobile. It is ready to be the pattern for flight development.
