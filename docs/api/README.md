# REST v1 API

The v1 API is the public surface for the driver mobile app. It is the
**only** external API exposed by the CabFleet monolith — the staff and
admin portals use Server Actions, and the customer portal uses route
handlers limited to webhooks. Anything driver-facing that doesn't fit
this surface should be added here rather than as a one-off endpoint.

## Authentication

`Authorization: Bearer <supabase-jwt>` on every request.

- Supabase JWTs are issued by `auth.signInWithPassword` (or the
  `supabase-js` mobile SDK).
- The token is verified server-side against the project JWKS endpoint
  at `${NEXT_PUBLIC_SUPABASE_URL}/auth/v1/.well-known/jwks.json`
  using `jose.jwtVerify` with asymmetric algorithms pinned
  (`RS256/RS384/RS512/ES256/ES384`).
- Legacy projects that still use the symmetric `JWT_SECRET` can opt in
  by setting `SUPABASE_JWT_LEGACY_SECRET`. When that env is set, **only**
  HS256 is accepted (no algorithm confusion with JWKS).

## Versioning

The route prefix `/api/v1/` is part of the contract. A breaking change
ships as `/api/v2/` and never as a mutation of v1.

## Feature flag

`API_V1_ENABLED` gates the whole surface. When false, every route
returns `403 { error: { code: "FORBIDDEN" } }` regardless of auth.

## Standard envelope

```json
// Success
{ "data": { ... } }

// Error
{ "error": { "code": "FORBIDDEN", "message": "..." } }

// Validation error
{ "error": { "code": "VALIDATION", "message": "Invalid input", "fieldErrors": { "amount": ["must be positive"] } } }
```

Status codes match `AppErrorCode`:

| Code               | HTTP |
|--------------------|------|
| `UNAUTHENTICATED`  | 401  |
| `FORBIDDEN`        | 403  |
| `NOT_FOUND`        | 404  |
| `VALIDATION`       | 400  |
| `CONFLICT`         | 409  |
| `RATE_LIMITED`     | 429  |
| `INTERNAL`         | 500  |

## Idempotency

Mutations support `Idempotency-Key: <opaque-token>` (alphanumerics +
`- _ . :`, ≤128 chars). The server caches the successful response per
`(profileId, route, key)` for `API_V1_IDEMPOTENCY_TTL_HOURS` (default
24h). A replay returns the original body with header
`Idempotent-Replay: true`. Error responses are **not** cached.

## Rate limits

Per-driver buckets (`profileId`-scoped):

| Bucket          | Limit       | Routes                                  |
|-----------------|-------------|-----------------------------------------|
| `apiClaim`      | 30 / min    | `POST /trips/:id/claim`                 |
| `apiLocation`   | 60 / min    | `POST /trips/:id/location[/batch]`      |
| `apiRead`       | 300 / min   | `GET /me`, `GET /trips/*`               |
| `apiWrite`      | 60 / min    | `POST /trips/:id/transition`, attendance |

Exceeding a bucket returns `429` with a `Retry-After` header.

> The current rate-limit store is in-memory. Production deploys must
> swap to Upstash Redis (env `UPSTASH_REDIS_REST_*`). The same swap
> applies to the idempotency cache.

## Endpoints (v1)

| Method | Path                                  | Purpose                              |
|--------|---------------------------------------|--------------------------------------|
| GET    | `/api/v1/me`                          | Driver profile + driver record       |
| GET    | `/api/v1/trips/open`                  | OPEN_FOR_CLAIM trips in driver's branch |
| GET    | `/api/v1/trips/mine`                  | Trips owned by this driver           |
| GET    | `/api/v1/trips/:id`                   | Booking detail (404 if not owned)    |
| POST   | `/api/v1/trips/:id/claim`             | Claim an OPEN_FOR_CLAIM trip         |
| POST   | `/api/v1/trips/:id/transition`        | Advance status (DRIVER_EN_ROUTE …)   |
| POST   | `/api/v1/trips/:id/location`         | Single live location point (W5)      |
| POST   | `/api/v1/trips/:id/location/batch`    | Batched live location points (W5)    |
| POST   | `/api/v1/attendance/check-in`         | Driver self check-in                 |
| POST   | `/api/v1/attendance/check-out`        | Driver self check-out                |

Location endpoints return `501 NOT_IMPLEMENTED` until Workstream 5
ships TripLocation ingestion.

## Spec

The full OpenAPI 3.1 spec lives in [`./v1.yaml`](./v1.yaml). It is
hand-written (no `zod-to-openapi` build dependency) so changes must be
mirrored from the route validators by hand. The `withApiHandler` test
suite verifies that the runtime contract matches the documented shape.
