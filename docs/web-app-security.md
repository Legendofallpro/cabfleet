# Web App Security (CabFleet)

This is the CabFleet-specific control set. Generic SaaS boilerplate (Clerk, etc.) does not apply. Architecture: [docs/architecture.md](architecture.md). RLS runbook: [docs/security/rls-lockdown.md](security/rls-lockdown.md). CSP: [docs/security/csp-policy.md](security/csp-policy.md).

## 1. Authentication (Supabase Auth)

- Browser sessions use `@supabase/ssr` `getUser()` in middleware (not `getSession()`).
- Staff (`SUPER_ADMIN` / `ADMIN` / `STAFF`) mutations require AAL2 when `STAFF_AAL2_REQUIRED=true` (`requireRole` / `requirePermission`). Playwright sets the flag false.
- Desk guests are not linked via public signup. Staff issues a 24h HMAC claim URL (`/claim-portal`).
- Soft-deleted profiles (`deletedAt`) cannot authenticate.
- Enable **CAPTCHA / bot protection** in the Supabase dashboard (Authentication → Attack protection). Login hits Supabase Auth directly, so the Next `/signin` IP limiter is not enough on its own.

## 2. Middleware and redirects

- Non-public routes require a signed-in user. Role checks live in layouts + server actions.
- `sanitizeRedirectTo` rejects `//`, `\`, `@`, encoded slashes, and anything outside `[a-zA-Z0-9/_#?&=.-]`.
- After password/MFA sign-in, navigation uses `getPostAuthRedirectAction` (role home), never a raw query param.

## 3. RBAC

Roles: `SUPER_ADMIN`, `ADMIN`, `STAFF`, `DRIVER`, `CUSTOMER`. Every server action starts with `requireRole` or `requirePermission`. REST v1 uses `withApiHandler` + `PERMISSIONS.*`.

## 4. Secrets and env

- App code reads env only through `src/lib/env.ts`.
- Never put `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, or `CRON_SECRET` in client bundles.
- Cron endpoints use constant-time Bearer comparison (`src/lib/cron-auth.ts`) and refuse to run without `CRON_SECRET`.

## 5. Errors and logging

- Clients see `AppError` codes/messages. Internals stay in pino.
- Logger redacts email, phone, password, token, gstin, licenseNumber, recipient, fullName.

## 6. Input validation

- Server actions wrap `action(name, zodSchema, fn)`. REST v1 parses JSON with a size cap.

## 7. Database and tenancy

- **Prisma is the only writer.** PostgREST is deny-all: ENABLE + FORCE RLS, restrictive `deny_direct_api_access`, `REVOKE ALL FROM anon, authenticated`.
- `migrate deploy` is the source of truth (`20260914150000_rls_force_deny_postgrest`). Do **not** apply `prisma/sql/07b_*` as written.
- Tenant reads/writes go through the Prisma org extension. RSC paths lazy-bind `profile.orgId` from the session and fail closed in production / when `MULTI_ORG_ENABLED`.
- Never `db.booking.update({ status })` outside `transitionBookingStatus` / `claimBooking`.

## 8. Hosting

- Vercel + Supabase. HSTS, `X-Frame-Options: DENY`, enforcing CSP from `src/lib/csp.ts`.

## 9. Payments

- Razorpay webhooks: HMAC on the raw body, event id from `x-razorpay-event-id`, fail-closed if the webhook secret is unset.
- Desk Record Payment is always Manual. Customer Pay now is the only Razorpay order path.
- Refunds are four-eyes (`requestRefund` / `approveRefund`). Do not auto-approve via `REFUND_AUTO_APPROVE_LIMIT_INR`.

## 10. PII

- Invoice PDFs live in a private `invoices` bucket; signed URLs last 60–300s after an ownership check. WhatsApp/email share `/portal/bookings/{id}`.
- Live GPS uses private Realtime channels (`trip:{bookingId}`) with JWT authorization. Keep `REALTIME_TRACKING_ENABLED=false` until `prisma/sql/15_realtime_private_trip.sql` is applied.
- Open-claim trip lists expose customer name only.
- DSR erasure writes sha256(email/phone) into `AuditLog.diff`, not plaintext.
- `MAPBOX_ACCESS_TOKEN` is server-only (no `NEXT_PUBLIC_` geocode key). Unset means no geocode calls.

## 11. Abuse controls

- Upstash (or in-memory) rate limits on auth HTML, server actions, and `/api/v1`.
- Client IP prefers `x-vercel-forwarded-for` / `cf-connecting-ip` over leftmost `X-Forwarded-For`.
- `MOBILE_APP_ORIGIN` is the CORS allow-list for `/api/v1`.
- CI runs `npm audit --omit=dev --audit-level=high` and fails the job on high/critical production advisories.

## 12. Privacy / DSR

- `eraseCustomer` scrubs Profile/Customer PII, deletes notification rows keyed by recipient, and retains Payment/Invoice for tax retention.

## 13. Ops checklist (not product features)

Apply before flipping live GPS or relying on pings in production:

1. `prisma migrate deploy`, then SQL [`13_profile_sync_ignore_org_slug.sql`](../prisma/sql/13_profile_sync_ignore_org_slug.sql) and [`14_invoice_storage.sql`](../prisma/sql/14_invoice_storage.sql).
2. Apply [`15_realtime_private_trip.sql`](../prisma/sql/15_realtime_private_trip.sql) in the Supabase SQL editor **and** enable Realtime Authorization for Broadcast in the dashboard. Only then set `REALTIME_TRACKING_ENABLED=true`.
3. Enable CAPTCHA / bot protection on the Supabase Auth dashboard.
4. Confirm staff MFA (AAL2) with `STAFF_AAL2_REQUIRED=true`.
5. Razorpay: test-mode keys, webhook secret, and `PAYMENT_GATEWAY=RAZORPAY` only after webhook IP allow-list is set.
6. Notifications: `NOTIFICATIONS_ENABLED`, Resend, and Twilio vars in `.env.example`. Leave `wa.me` Share on the desk as the fallback.

