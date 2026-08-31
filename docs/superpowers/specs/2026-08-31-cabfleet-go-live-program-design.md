# CabFleet go-live program — design

Date: 2026-08-31  
Status: draft for review  
Product: CabFleet (Next.js + Prisma + Supabase monolith)  
Operator: Indian mixed travel desk (phone/WhatsApp bookings, airport + local + outstation, cash/UPI, GST bill). Customer app is extra. Sandbox until a real operator exists.

This spec is the program. Implementation starts with **Wave 1 only**. Waves 2–4 get their own plans after Wave 1 is usable on demo accounts.

## 1. Thesis

CabFleet is already a working dispatch product. It is not rewritten. It is reshaped so a **counter clerk on a phone call** can book, quote, assign, collect, and share a bill without fighting TailAdmin chrome or seed-only config.

What already works and stays: booking state machine (`transitionBookingStatus` / `claimBooking` only), dispatch rules, driver claim, admin fleet CRUD, Razorpay provider (admin-driven today), invoice PDF pipeline, MapLibre tracking, REST v1, MFA enroll UI, `en-IN` / `₹` / `Asia/Kolkata` / booking types Local · Outstation · Rental · Airport.

What is wrong for India today: staff booking is a generic form that requires picking an emailed customer; fare is only base + ₹/km + ₹/min with no quote override; invoices have no GSTIN; WhatsApp is unused; Settings “Configure” does nothing; the customer portal leads with emoji and loyalty; the admin shell still feels like a template.

## 2. Non-goals (explicit)

Out of this program:

- Rewrite, shadcn, tRPC, Zustand, React Native
- Hindi / bilingual UI (English, large type on driver screens in Wave 4)
- Driver/customer phone-OTP login (staff-managed customers are the India walk-in path instead)
- 8hr/80km · 12hr/120km package engine, driver bata, night halt
- IRP e-invoice, GSTR-1 export, Tally
- Twilio/Meta WhatsApp template automation (Share button instead)
- Custom UPI QR or UPI collect (Razorpay Checkout is the UPI UX)
- Geocoding / place autocomplete
- Impersonation, loyalty mutations, RazorpayX driver payouts, multi-org SaaS UX
- Live Razorpay keys or real passengers (sandbox only)

## 3. Sandbox

No real customers or live rupees are required.

- Staff-managed customers: your 10-digit test mobiles
- Portal customers (optional): Gmail `+` aliases if you want `/portal`
- Money: `PAYMENT_GATEWAY=MANUAL` by default; Razorpay only with `rzp_test_…`
- GSTIN in Settings may be empty; rate `0` hides tax lines while you test
- Resend optional; WhatsApp Share opens the local WhatsApp client

## 4. Identity: phone-primary customers

Staff identify a guest by **name + Indian mobile**. Email is optional and only needed for `/portal`.

### 4.1 Rules

- Normalize phones with existing `toE164(..., "IN")`. Reject invalid numbers.
- `Profile.phone` is unique when set. Same number → same customer (no duplicates).
- New desk customer: `auth.admin.createUser` with a **synthetic** email `{e164-digits}@staff.cabfleet.invalid`, random password, `email_confirm: true`, **no invite email**. Profile role `CUSTOMER`, `Customer.staffManaged = true`.
- Public `/signup` rejects `*.invalid` emails.
- `/portal` for `staffManaged` users redirects to a short “this booking is managed by the operator” page until staff adds a real email and sends an invite (same pattern as `inviteDriver`).
- `/customers/new` and the booking form both call `findOrCreateStaffCustomer`. Optional `inviteCustomer` remains for guests who should get portal access immediately (real email required).

### 4.2 Why not optional Profile.email

`Profile.id` is `auth.users.id`. Auth still needs an email. Synthetic `.invalid` addresses are undeliverable, cannot reset password, and cannot sign in in practice. A boolean `staffManaged` is the source of truth — do not parse the email domain in feature code except for signup rejection.

## 5. Desk UX (the product)

The staff **New booking** screen is a phone-call form, not a CRM dump. One column, large fields, IST datetimes.

1. **Mobile** — 10 digits; as the clerk tabs away, lookup by E.164. Hit: show name, reuse customer. Miss: name field appears; save will `findOrCreateStaffCustomer`.
2. **When** — pickup local datetime.
3. **Pickup / drop** — address plus optional landmark (“opp. Metro, near temple”).
4. **Type** — Local / Airport / Outstation / Rental (admin-editable booking types).
5. **Km** — optional; feeds `estimateFare`.
6. **Estimate** — live from pricing rules (read-only).
7. **Quoted ₹** — staff override; this becomes `fareEstimate`. Empty → keep calculator total.
8. **Toll / parking** — default 0; editable later on the booking while not terminal. `fareFinal` on complete = quoted/estimate + toll + parking.
9. **Passengers, notes, branch**.

After save: booking detail with **Share on WhatsApp** (`https://wa.me/91XXXXXXXXXX?text=...` using the customer’s E.164, prefilled trip summary + app link). Same control on the invoice once a PDF exists. Fallback: copy text. No Meta templates.

Do not auto-assign vehicle from `VehicleAssignment` in Wave 1. Clerk still picks driver + vehicle.

Customer `/portal/book` stays; it is not the desk. Remove emoji from customer chrome when those files are touched. Loyalty remains display-only.

## 6. Comfortable integrations

Use the vendor’s UI. Do not rebuild it.

| Need | What we ship | What we do not build |
|------|----------------|----------------------|
| UPI / cards | Razorpay Standard Checkout (`checkout.js` modal already in tree). UPI is Razorpay’s India default. Test keys only. | Custom QR, collect requests, wallet apps |
| Cash / UPI at the kerb | Staff **Record payment** (existing methods include UPI and cash) | Driver collecting in-app in Wave 1 |
| WhatsApp | Share button (`wa.me`) | Twilio template sends |
| Maps | Existing live trip MapLibre when tracking is on | Address autocomplete |
| GST | Tax invoice PDF shape + Settings rate | IRP / GSP |

## 7. Waves

### Wave 1 — Desk can run a trip

- Rebuild admin booking create as the desk form; PENDING edit of addresses/time/notes/passengers/km/quote/toll/parking (not status). Recalc estimate when km/type/branch change. Never `db.booking.update({ status })`.
- Schema: `Customer.staffManaged`, unique `Profile.phone`, `Booking.tollAmount` and `Booking.parkingAmount` (Decimal, default 0). RLS for new columns as required by existing lockdown SQL pattern.
- Pricing + booking-type admin CRUD (`/settings/pricing`, `/settings/booking-types`). STAFF: view. ADMIN: manage. `surgeJson` unused.
- Settings hub: real links only (Branches, Dispatch, Pricing, Booking types, Account security). Delete fake Billing/Integrations cards.
- VehicleAssignment assign/end (one open row per driver).
- Reports date bug: filter `to` not `defaultTo`.
- Bookings/new warning uses semantic tokens; “create in Settings” points at the new pages.
- WhatsApp Share on booking (and invoice if pdf present).
- Tests: `findOrCreateStaffCustomer` (duplicate phone, invalid phone, signup reject `.invalid`), quote vs estimate, PENDING guard, fareCalculator, assignment overlap.

### Wave 2 — Money, GST bill, trust

- Staff cash/UPI remains the travel-desk money path.
- `PAYMENT_PAY_OWN` + portal Checkout for guests who have portal access; amount from server (`fareFinal ?? fareEstimate` + extras − CAPTURED). IDOR tests required.
- Auto-generate invoice on `COMPLETED` (after the transition transaction).
- GST-shaped PDF: operator legal name, address, GSTIN (optional), SAC **9964**, taxable value, CGST/SGST (intra) or IGST (if a future interstate flag exists; Wave 2 default **CGST+SGST split of the configured rate**). Settings: GSTIN, legal name, state, rate enum `0 | 5 | 12` (0 = no tax lines). Empty GSTIN still allowed; show “Unregistered” rather than lying.
- MFA `aal2` required for ADMIN/STAFF/SUPER_ADMIN. Not for DRIVER/CUSTOMER.
- Audit log viewer (`AUDIT_VIEW`), notifications page in nav.
- Email templates verified if Resend is set. No WhatsApp automation.

### Wave 3 — Reliability

- Local `npm test` env bootstrap. Unit tests for Wave 1–2 services.
- Playwright happy path: staff phone-book → assign → complete → invoice; optional driver claim; optional Razorpay test. Do not block CI until a test Supabase exists.
- Keep CSP Report-Only until `e2e:csp` is clean for a week.
- Pre-deploy: `npm run load-test:claim`.

### Wave 4 — Less template, still desk-first

- Anonymous landing at `/` (IST, ₹, Book / Staff sign-in). Signed-in `/` unchanged role home.
- Strip TailAdmin dead chrome (fake header search, unused demo UI). Token-migrate `src/layout/` and `src/components/form/`.
- Driver screens: larger tap targets, trip-first, English.
- README / AGENTS / architecture / api docs match reality (Next 16, India desk, no leftover ApexCharts list).
- Location consent after book; then CSP enforce per existing policy.

## 8. Architecture constraints (unchanged)

- Module shape in AGENTS.md. Actions thin; services own transactions and `writeAudit`.
- Cross-module via services/queries only.
- Semantic tokens in `src/app/**` and `src/modules/**`. Status via `<StatusBadge>`.
- `dynamic = "force-dynamic"` on DB layouts.
- Env via `src/lib/env.ts` only.

## 9. Success (Wave 1 done)

On demo data, without live payments:

1. Clerk types a 10-digit mobile, name, airport pickup, quoted ₹, saves.
2. Same mobile on a second booking reuses the customer.
3. Clerk cannot log into `/portal` as that customer.
4. Clerk sets a pricing rule and a booking type in Settings (no seed dependency for new types).
5. Clerk pairs a vehicle to a driver, assigns both on the booking, completes the trip.
6. Share on WhatsApp opens with the trip text.
7. Reports “To” date matches the filter.
8. Settings has no dead “Configure” rows.

## 10. Implementation order

Write this spec → Wave 1 implementation plan → ship Wave 1 → then Wave 2 plan (GST PDF, pay, MFA, audit).
