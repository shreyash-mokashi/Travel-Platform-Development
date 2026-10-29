# Voyago — API contracts

Base URL: `http://localhost:4000/api/v1`
Interactive docs (development only): `http://localhost:4000/api/docs`

All money is an **integer number of paise**. The demo currency is **INR**.

---

## Conventions

### Authentication

Protected endpoints require `Authorization: Bearer <accessToken>`. Access tokens last 15
minutes; refresh tokens last 7 days and rotate on every use.

In the web application the browser never holds a token — the Next.js server stores both in
`httpOnly` cookies and forwards the access token server-side.

### Error envelope

Every error, from every endpoint, has the same shape:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Request validation failed",
  "details": ["checkOut must be at least one night after check-in."],
  "requestId": "7be2cbc4-5b65-4572-9abe-dd1be7389569",
  "timestamp": "2026-10-28T09:46:00.597Z",
  "path": "/api/v1/hotels/search"
}
```

`details` appears only for validation failures. **Stack traces and internal messages are never
returned.**

### Status codes

| Code      | Meaning                                                            |
| --------- | ------------------------------------------------------------------ |
| 200 / 201 | Success                                                            |
| 204       | Success, no body                                                   |
| 400       | Validation failed, or an unknown property was sent                 |
| 401       | Missing, invalid or expired token                                  |
| 403       | Authenticated but not permitted (admin-only route)                 |
| 404       | Not found — also returned for another user's booking, deliberately |
| 409       | Conflict: quote already used, invalid state transition, sold out   |
| 429       | Rate limit exceeded                                                |

**Unknown request properties are rejected with 400**, not ignored. This is what blocks mass
assignment of fields such as `status` or `totalMinor`.

### Pagination

```json
{ "items": [], "page": 1, "pageSize": 10, "total": 25, "totalPages": 3 }
```

---

## Health

### `GET /health`

Liveness. Public.

```json
{ "status": "ok", "uptimeSeconds": 142 }
```

### `GET /health/ready`

Readiness, including both databases. Public.

```json
{
  "status": "ok",
  "checks": {
    "postgres": { "status": "up", "latencyMs": 7 },
    "mongo": { "status": "up", "latencyMs": 5 }
  },
  "timestamp": "2026-10-28T09:45:20.481Z"
}
```

`status` is `degraded` when either check is `down`.

---

## Authentication

### `POST /auth/register` — 201

Public. Rate limited to 30/minute.

```json
{
  "email": "traveller@example.com",
  "password": "at-least-10-chars-1",
  "firstName": "Aarav",
  "lastName": "Sharma",
  "phone": "+91 98200 12345"
}
```

Password must be at least 10 characters with a letter and a digit. `role` **cannot** be set —
sending it returns 400.

Returns `{ user, accessToken, refreshToken, expiresIn }`. The password hash is never included.

**409** if the email is already registered.

### `POST /auth/login` — 200

Public. Rate limited to 30/minute. Body: `{ email, password }`.

**401** returns the identical message for an unknown email and a wrong password, so the
endpoint cannot be used to enumerate accounts.

### `POST /auth/refresh` — 200

Public. Body: `{ refreshToken }`. Returns a new pair and **revokes the token presented**.
Replaying a rotated token returns 401.

### `POST /auth/logout` — 204

Public. Body: `{ refreshToken }`. Revokes that token.

### `GET /auth/me` — 200

Authenticated. Returns the current `AuthUser`.

### `PATCH /auth/me` — 200

Authenticated. Accepts only `firstName`, `lastName`, `phone`. Email and role cannot be changed.

### `POST /auth/me/password` — 204

Authenticated. Body: `{ currentPassword, newPassword }`. **Revokes every other session.**

---

## Destinations

### `GET /destinations` — 200

Public. Optional `?q=` for autocomplete. Returns destinations with `hotelCount`.

### `GET /destinations/popular` — 200

Public. The six home-page destinations.

### `GET /destinations/:slug` — 200

Public. Destination detail plus its MongoDB editorial `content` (or `content: null` if the
content store is unavailable).

---

## Hotels

### `GET /hotels/search` — 200

Public. **All inventory is seeded demo data.**

| Parameter                        | Required | Notes                                                       |
| -------------------------------- | -------- | ----------------------------------------------------------- |
| `destination`                    | yes      | slug, city name or id                                       |
| `checkIn`, `checkOut`            | yes      | `YYYY-MM-DD`                                                |
| `rooms`                          | no       | 1–5, default 1                                              |
| `adults`                         | no       | ≥1, default 2                                               |
| `children`                       | no       | ≥0, default 0                                               |
| `page`, `pageSize`               | no       | default 1, 10 (max 50)                                      |
| `sort`                           | no       | `relevance` \| `price_asc` \| `price_desc` \| `rating_desc` |
| `minPriceMinor`, `maxPriceMinor` | no       | filter on the stay total                                    |
| `starRatings`                    | no       | e.g. `4,5`                                                  |
| `amenities`                      | no       | AND semantics; unknown codes are a 400                      |
| `mealPlans`                      | no       | OR semantics                                                |
| `freeCancellation`               | no       | `true`                                                      |

Validation: check-out must be at least one night after check-in, at most 30 nights, not in the
past, and at most 365 days ahead. Violations return **400** with a human-readable message.
An unknown destination returns **404**.

Response adds `searchId`, `destination`, `nights`, occupancy, `currency` and `facets`
(price range, star counts, amenity counts, meal-plan counts, free-cancellation count) to the
standard pagination envelope. Only hotels with at least one bookable offer are returned.

### `GET /hotels/featured` — 200

Public. Top-rated hotels for the home page. No pricing, since there is no stay context.

### `GET /hotels/:slug` — 200

Public. Requires the same stay parameters. Returns full hotel detail plus `offers[]` — every
bookable room × rate-plan combination, each with `roomsAvailable` and a complete `price`
breakdown — and `content` from MongoDB.

**404** for an unknown slug.

---

## Pricing and inventory holds

### `POST /quotes` — 201

Public (associated with the user when authenticated).

```json
{
  "hotelId": "…",
  "roomId": "…",
  "ratePlanId": "…",
  "checkIn": "2026-12-10",
  "checkOut": "2026-12-13",
  "rooms": 1,
  "adults": 2,
  "children": 0,
  "expectedTotalMinor": 4993800
}
```

`expectedTotalMinor` is **advisory only** — it is used solely to set `priceChanged` in the
response so the UI can warn the user. Sending `totalMinor` (or any other unknown field) is a
**400**; the server always recomputes the authoritative price.

Returns `quoteId`, `expiresAt` (20 minutes), the resolved `offer`, `priceChanged` and
`previousTotalMinor`.

**While a quote is unexpired and unconsumed it holds its rooms against everyone else's
availability.**

**400** if the room is not available for those dates or occupancy.

### `GET /quotes/:id` — 200

Re-reads and **reprices** the quote. **400** if expired or already used.

---

## Bookings

All booking endpoints require authentication. Ownership is enforced server-side; another
user's booking returns **404**, never 403.

### `POST /bookings` — 201

```json
{
  "quoteId": "…",
  "contactEmail": "traveller@example.com",
  "contactPhone": "+91 98200 12345",
  "guests": [{ "firstName": "Aarav", "lastName": "Sharma", "isLeadGuest": true }],
  "specialRequests": "High floor if possible",
  "acceptedCancellationPolicy": true
}
```

The **quote is the only source of price**. The server reprices it, re-checks availability, and
freezes `priceSnapshot`, `cancellationPolicySnapshot` and `hotelSnapshot` onto the booking.

Creates the booking in `PENDING_PAYMENT` with a 30-minute payment window and a unique
`VYG-XXXXXXXX` reference.

- **400** — policy not accepted, invalid contact details, no guests, or an unknown property
- **409** — quote already used by a different user, or the room sold out while booking

Replaying the **same request with the same quote** returns the booking that was already
created, rather than creating a second one.

### `GET /bookings` — 200

The caller's own bookings, paginated. Optional `?status=`.

### `GET /bookings/:idOrReference` — 200

Accepts either the UUID or the `VYG-…` reference.

### `POST /bookings/:idOrReference/payments` — 200

> **Demo Payment — No real money is charged.** No card details are accepted and no payment
> gateway is contacted.

```json
{ "scenario": "SUCCESS", "idempotencyKey": "a-unique-key" }
```

| Scenario  | Booking status       | Payment status |
| --------- | -------------------- | -------------- |
| `SUCCESS` | `CONFIRMED`          | `SUCCEEDED`    |
| `FAILURE` | `PAYMENT_FAILED`     | `FAILED`       |
| `PENDING` | `PAYMENT_PROCESSING` | `PENDING`      |

The **server** decides the outcome from the scenario. A client cannot send `status`,
`paymentStatus` or `totalMinor` — those are 400s.

**Idempotency**: replaying a key returns the original attempt and the current booking
unchanged, even if the replay requests a different scenario.

Returns `{ booking, attempt, notice }` where `notice` is the demo-payment disclaimer.

- **409** — already confirmed, not in a payable state, or the key belongs to another booking
- **400** — unknown scenario, or the payment window has closed

### `POST /bookings/:idOrReference/payments/resolve` — 200

Finishes a `PENDING` demo payment. Body: `{ "outcome": "SUCCESS" | "FAILURE" }`.
**409** if there is no pending payment.

### `POST /bookings/:idOrReference/cancellation` — 200

Body: `{ "reason": "optional, max 300 chars" }`.

The **seeded policy decides the refund** — this is not an automatic full refund:

- Refundable rate, outside the penalty window → full refund, `refundStatus: REFUNDED`
- Refundable rate, inside the window → partial refund per the tier
- Non-refundable rate → `refundMinor: 0`, `refundStatus: REJECTED`
- Never paid → `refundMinor: null`, `refundStatus: NOT_APPLICABLE`

Refunds are **simulated**; no money moves.

**409** if already cancelled or the status does not permit cancellation.

---

## Admin

All admin endpoints require an `ADMIN` role. A customer token returns **403**.
Every figure is computed from the database.

| Endpoint                             | Returns                                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /admin/overview`                | Bookings and payments by status, confirmed value, refunded total, inventory counts, customer count, MongoDB snapshot count, recent bookings |
| `GET /admin/bookings`                | All bookings; filters `status`, `q` (reference, email or hotel name), `hotelId`                                                             |
| `GET /admin/bookings/:idOrReference` | Any booking, bypassing the ownership check                                                                                                  |
| `GET /admin/hotels`                  | Hotel inventory list with room and booking counts                                                                                           |
| `GET /admin/hotels/:id/inventory`    | Rooms, rate plans and the next 30 nights of inventory                                                                                       |
| `PATCH /admin/hotels/:id`            | Update hotel details                                                                                                                        |
| `PATCH /admin/rooms/:id`             | Update a room type                                                                                                                          |
| `PATCH /admin/rate-plans/:id`        | Update a rate plan                                                                                                                          |
| `PATCH /admin/rooms/:id/inventory`   | Bulk update `roomsOpen` / `baseRateMinor` over a date range                                                                                 |
| `GET /admin/refunds`                 | Simulated refund records with their policy reason                                                                                           |
| `GET /admin/audit`                   | Audit history of administrative changes                                                                                                     |

Every mutating admin call writes an `AdminAuditLog` entry naming the acting administrator.

---

## Rate limiting

| Scope                                     | Limit                                                            |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Global                                    | `THROTTLE_LIMIT` per `THROTTLE_TTL_SECONDS` (default 300/minute) |
| `POST /auth/register`, `POST /auth/login` | 30/minute                                                        |

Exceeding a limit returns **429**.

## Flights

The flight service mirrors the hotel contracts: public search and quoting, authenticated
bookings, the same demo-payment scenarios and error envelope. Flight booking references use
the `VYF-` prefix (hotels use `VYG-`), so a reference always names its product.

### `GET /flights/airports` — 200

The six demo airports: `[{ iata, name, city }]`.

### `GET /flights/search` — 200

Query: `from`, `to` (IATA), `date` (yyyy-mm-dd, tomorrow..+365), `adults` (1-9),
`children` (0-8, total party ≤ 9), optional `sort`
(`departure_asc` default, `price_asc`, `price_desc`, `duration_asc`).

Returns every operating flight on the route-date with its sellable fare families:

```json
{
  "searchId": "…",
  "origin": { "iata": "BOM", "name": "…", "city": "Mumbai" },
  "destination": { "iata": "DEL", "name": "…", "city": "New Delhi" },
  "date": "2027-01-15",
  "adults": 2, "children": 0, "currency": "INR",
  "items": [{
    "segment": { "flightId": "…", "airline": { "code": "ZV", "name": "Zephyr Airways" },
      "flightNumber": "ZV 263", "origin": { … }, "destination": { … },
      "date": "2027-01-15", "departureMinute": 400, "arrivalMinute": 495,
      "dayOffset": 0, "durationMinutes": 95, "aircraft": "A320neo" },
    "fares": [{ "fareClassId": "…", "code": "SAVER", "name": "Saver", "cabin": "ECONOMY",
      "checkinBaggageKg": 15, "cabinBaggageKg": 7, "mealIncluded": false,
      "seatSelectionIncluded": false, "seatsLeft": 12, "refundable": false,
      "cancellationPolicy": { … }, "price": { "lines": [ … ], "totalMinor": 948000, … } }],
    "leadTotalMinor": 948000
  }],
  "total": 3
}
```

`seatsLeft` already excludes seats held by live quotes and by bookings that still hold
inventory. Fares within a flight are sorted cheapest first.

### `POST /flight-quotes` — 201 (public)

Body: `flightId`, `fareClassId`, `date`, `adults`, `children`, optional `expectedTotalMinor`
(used only to set `priceChanged`). Recomputes the authoritative total server-side and holds
the seats for 20 minutes. Returns a `FlightQuoteView` with `quoteId`, `expiresAt`, the
`segment`, the priced `fare`, and `priceChanged`/`previousTotalMinor`.

### `GET /flight-quotes/:id` — 200 (public)

Re-reads and reprices an existing quote. 400 when consumed, expired or malformed; a quote
created while signed in is invisible to other users (404).

### `POST /flight-bookings` — 201 (auth)

Body: `quoteId`, `contactEmail`, `contactPhone`, `passengers` (exactly one name per quoted
traveller; the first adult is the lead), `acceptedCancellationPolicy: true`. Consumes the
quote transactionally, snapshots the segment, fare, price and policy, and answers with a
`FlightBookingView` in `PENDING_PAYMENT`. Re-posting a consumed quote returns the booking it
already produced for its owner and 409 for anyone else.

### `GET /flight-bookings` · `GET /flight-bookings/:idOrReference` — 200 (auth)

The signed-in user's flight bookings; a single booking by UUID or `VYF-` reference.
Other users' bookings are 404, never 403.

### `POST /flight-bookings/:idOrReference/payments` — 201 (auth)

Same body and semantics as hotel payments: `scenario` (`SUCCESS`/`FAILURE`/`PENDING`) plus a
client `idempotencyKey` whose replay returns the original attempt. Writes
`flight_payment_attempts`; the state machine and notices are identical.

### `POST /flight-bookings/:idOrReference/payments/resolve` — 200 (auth)

Finishes a deliberately pending demo payment with `outcome: SUCCESS | FAILURE`.

### `POST /flight-bookings/:idOrReference/cancellation` — 200 (auth)

Cancels under the fare's cancellation policy and records a `flight_refunds` row when the
booking was paid. Unpaid bookings cancel with `refundStatus: NOT_APPLICABLE`.
