# CabFleet go-live program — design

Date: 2026-08-31  
Status: draft for review  
Product: CabFleet (Next.js + Prisma + Supabase monolith)  
Operator: Indian mixed travel desk **and** self-serve customer + driver web apps. Phone/WhatsApp + airport/local/outstation, cash/UPI, GST bill. Sandbox until a real operator exists.

This spec is the program. Implementation starts with **Wave 1 only**. Waves 2–4 get their own plans after Wave 1 is usable on demo accounts.

Three surfaces are equal. None is “extra”:

| Who | Job | Ease rule |
|-----|-----|-----------|
| **Staff** | Phone rings → book → assign → collect | One-column call form, 10-digit mobile |
| **Customer** | Book and follow the trip on a phone | Three steps, big type, one status sentence, Call driver |
| **Driver** | Claim or run the assigned trip | One thumb: Call, Maps, one next-status button |

## 1. Thesis

CabFleet is already a working dispatch product. It is not rewritten. It is reshaped so:

1. A **counter clerk** can book from a phone call without a CRM dropdown.
2. A **passenger** can book and track without knowing dispatch jargon (no emoji, no loyalty theatre, live ₹ estimate).
3. A **driver** can run the trip with one thumb (Call, Navigate, next status).

What already works and stays: booking state machine (`transitionBookingStatus` / `claimBooking` only), dispatch rules, driver claim, admin fleet CRUD, Razorpay provider, invoice PDF pipeline, MapLibre live map, REST v1, MFA enroll UI, `en-IN` / `₹` / `Asia/Kolkata` / types Local · Outstation · Rental · Airport.

What is wrong today: staff booking requires an emailed customer; fare has no quote override; invoices have no GSTIN; WhatsApp is unused; Settings “Configure” is fake; customer portal is emoji + loyalty + “staff will confirm fare”; driver trip detail is a stack of cards with a small action buried at the bottom.

## 2. Non-goals (explicit)

- Rewrite, shadcn, tRPC, Zustand, React Native (driver uses the existing web portal + REST later)
- Hindi / bilingual UI (English; driver uses large type)
- Phone-OTP login (signup stays email + password + **required Indian mobile**)
- 8hr/80km package engine, driver bata, night halt
- IRP e-invoice, GSTR-1, Tally
- Twilio/Meta WhatsApp template automation (`wa.me` Share instead)
- Custom UPI QR (Razorpay Checkout is the UPI UX)
- Map-pin / place-autocomplete booking (typed address + landmark)
- In-app turn-by-turn navigation (open Google Maps / Apple Maps)
- Impersonation, loyalty mutations, RazorpayX payouts, multi-org SaaS UX
- Live Razorpay keys or real passengers

## 3. Sandbox

No real customers or live rupees.

- Desk guests: any 10-digit test mobile (staff-managed, no portal)
- Customer app: a Gmail `+` alias you sign up with (real email + phone)
- Driver: existing invite-to-email flow
- Money: `PAYMENT_GATEWAY=MANUAL`; Razorpay only with `rzp_test_…`
- GSTIN may be empty; rate `0` hides tax lines

## 4. Identity: phone-primary (desk) vs portal (app)

Two legitimate customers:

**Desk guest** — clerk enters name + mobile. `findOrCreateStaffCustomer`: unique E.164 phone, `Customer.staffManaged = true`, synthetic `{digits}@staff.cabfleet.invalid`, no invite, **cannot use `/portal`**. WhatsApp Share is how they get trip text.

**App customer** — `/signup` with name, **phone**, email, password. `staffManaged = false`. Full `/portal`. Public signup rejects `*.invalid` emails. Phone unique: if the number already belongs to a staff-managed row, **link** that Profile (add real email, send invite, set `staffManaged = false`) instead of creating a duplicate.

`Profile.phone` unique when set. `toE164(..., "IN")`. `staffManaged` is the portal gate — do not parse the email domain except to reject signup.

Optional `inviteCustomer` from admin when the clerk wants the guest to get the app immediately (real email required).

## 5. Staff desk UX

The staff **New booking** screen is a phone-call form. One column, large fields, IST.

1. **Mobile** — 10 digits; lookup on blur. Hit: reuse name. Miss: name field; save calls `findOrCreateStaffCustomer`.
2. **When** — pickup datetime.
3. **Pickup / drop** — address + optional landmark.
4. **Type** — Local / Airport / Outstation / Rental.
5. **Km** — optional; feeds `estimateFare`.
6. **Estimate** — live, read-only.
7. **Quoted ₹** — staff override → `fareEstimate`. Empty → calculator.
8. **Toll / parking** — default 0; editable until terminal. On complete, `fareFinal` = quote/estimate + toll + parking.
9. **Passengers, notes, branch**.

After save: **Share on WhatsApp** (`wa.me/91…` with trip summary). If the customer has portal access, the text includes `/portal/bookings/{id}`. Clerk still assigns driver + vehicle (no auto-fill from `VehicleAssignment`).

PENDING edit: addresses, time, notes, passengers, km, quote, toll, parking — never `status`.

## 6. Customer app UX (easy on a phone)

Mobile-first, `max-w-lg`, bottom nav on small screens: **Book · My trips · Me**. No taxi emoji, no loyalty tier on home. Sticky **Book** is the only primary chrome action.

Plain language for status (not enum names in the UI):

| Status | Customer sees |
|--------|----------------|
| PENDING | Waiting for confirmation |
| OPEN_FOR_CLAIM | Finding a driver |
| CLAIMED / ASSIGNED | Driver assigned |
| DRIVER_EN_ROUTE | Driver on the way |
| IN_PROGRESS | Trip in progress |
| COMPLETED | Trip completed |
| CANCELLED / NO_SHOW / FAILED | Cancelled / No-show / Couldn’t complete |

### 6.1 Sign up / sign in

- Sign up: full name, 10-digit mobile, email, password. Phone validated IN.
- Sign in: email + password (unchanged). Reset password stays email.
- After sign-in → `/portal` (home), not a blank dashboard.

### 6.2 Home (`/portal`)

If there is an active trip (not terminal): **one large card** — status sentence, pickup time, from → to, **View trip**.

If none: short welcome (name only) + full-width **Book a ride**.

Below: last 3 trips as rows (date, type, ₹, status). No stats grid, no “You’ve taken N rides” hero.

### 6.3 Book (`/portal/book`) — three steps

Rebuild the existing wizard. Same `createBooking` service. No quote override (that is staff-only).

1. **Ride type** — large tappable cards (Local, Airport, Outstation, Rental) with one-line English descriptions. Icons, not emoji. One tap selects and enables Continue.
2. **Journey** — pickup address, pickup landmark (optional), drop address, drop landmark (optional), datetime, passengers. Distance optional (“helps estimate fare”). Notes optional. Hide branch (use the customer’s branch or the single HQ default).
3. **Review** — summary + **live ₹ estimate** from `estimateFare` (server). If no rule or km missing: show estimate if possible, else “Operator will confirm the fare.” Location-consent checkbox stays. Full-width **Confirm booking**. Back to edit.

On success: go to **that trip’s detail**, toast “Booking placed.”

### 6.4 My trips (`/portal/bookings`)

Two groups: **Upcoming** then **Past**. Each row: date/time, from → to (one line each, truncate), status chip, ₹. Tap → detail. Empty upcoming: CTA to Book.

### 6.5 This trip (`/portal/bookings/[id]`) — the important screen

Order on the page (top to bottom):

1. Status sentence + chip.
2. When, from, to (landmarks if present).
3. Fare: estimate, extras, paid / pay (Wave 2).
4. **Your driver** (only after CLAIMED/ASSIGNED): name, vehicle (make model · reg), **Call** (`tel:`), optional **WhatsApp**. Hide driver phone before assignment.
5. Live map only when trip is active **and** consent given (existing MapLibre).
6. Actions: **Cancel** if PENDING or OPEN_FOR_CLAIM. **Edit** if PENDING (same fields as book step 2). **Download invoice** when `pdfUrl` exists. **Pay now** in Wave 2 if outstanding > 0 (Razorpay modal).

No branch code, no dispatch-mode, no internal ids in the UI (booking ref = last 8 of id is OK).

### 6.6 Me (`/portal/profile`)

Name, phone, email (email read-only). Password + MFA optional (do not force). Sign out. No loyalty editor.

## 7. Driver app UX (easy with one thumb)

Keep the existing bottom nav: **Home · Open · My trips · Duty · Me**. English. Minimum 44px taps. Dark mode stays.

### 7.1 Home (`/driver`)

- If an active trip exists: **full-width banner** — status, pickup time, from, **Open trip** (goes to detail). This is the default job.
- Else: “No trip right now” + link to Open trips.
- Today’s duty (check-in) compact, not the hero.
- Today’s ₹ as a small figure, not a dashboard.

### 7.2 Open trips (`/driver/trips/open`)

One card per claimable job: pickup time, from → to, type, estimate ₹. Full-width **Claim**. After claim: that trip’s detail. Empty: “No open trips.”

### 7.3 Trip detail (`/driver/trips/[id]`)

Sticky **bottom action bar** (above the app nav or replacing it on this page so the thumb hits it):

- **Call customer** (`tel:`) — only after the driver owns the trip.
- **Navigate** — `https://www.google.com/maps/dir/?api=1&destination=` + encoded pickup (or drop once IN_PROGRESS). Opens the phone’s maps app. No in-app navigator.
- **Primary status button** — exactly the next happy-path action, large: “I’m on my way” → “Start trip” → “Complete trip”.
- No-show stays a text-style danger action, not the same size as Complete.

Above the bar: route (green pickup / red drop), time, type, passengers, fare. Customer name + phone only after claim/assign (already enforced).

### 7.4 My trips / Duty / Me

Lists and attendance stay. Profile: vehicle assignment (read-only until staff pairs), account security. No extra chrome.

## 8. Comfortable integrations

| Need | What we ship | What we do not build |
|------|----------------|----------------------|
| UPI / cards | Razorpay Checkout modal | Custom QR |
| Cash / UPI at kerb | Staff record payment | Driver in-app collect in Wave 1 |
| WhatsApp | Share (`wa.me`) on staff booking/invoice; customer **WhatsApp driver** after assign | Twilio templates |
| Maps (track) | Existing MapLibre on customer trip when consented | Pin-to-book |
| Maps (drive) | Google Maps `dir` URL | In-app navigation SDK |
| Call | `tel:` on customer↔driver | In-app voice |
| GST | Tax invoice PDF in Wave 2 | IRP / GSP |

## 9. Waves

### Wave 1 — All three can run a trip (sandbox)

Staff: desk form, phone-primary customers, quote + toll/parking, Settings (pricing, booking types, real hub), VehicleAssignment, reports `to` bug, WhatsApp Share, PENDING edit.

Customer: layout (no emoji, Book/Trips/Me), home as next-trip card, 3-step book with **live estimate**, trip detail with plain status + Call driver, my-trips grouping, phone on signup.

Driver: home = active trip first, open-trip claim cards, trip detail Call + Navigate + fat primary action.

Schema: `Customer.staffManaged`, unique `Profile.phone`, `Booking.tollAmount` / `parkingAmount`, optional landmark fields on booking (or encode landmark in address with a labeled second input stored on Booking as `pickupLandmark` / `dropLandmark` — prefer real columns). RLS for new columns.

Tests: findOrCreateStaffCustomer; signup phone unique / link staff-managed; customer estimate on review; PENDING guards; claim still locked; driver action map unchanged.

### Wave 2 — Money, GST bill, trust

Staff cash/UPI; customer **Pay now** (Razorpay test, server amount, IDOR); auto-invoice on COMPLETED; GST-shaped PDF (GSTIN optional, SAC 9964, rate 0/5/12); MFA aal2 for ADMIN/STAFF/SUPER_ADMIN; audit viewer; notifications nav.

### Wave 3 — Reliability

`npm test` env bootstrap; Playwright: **customer book → staff assign → driver on-the-way/complete → invoice**; plus desk phone-book path. CSP stays Report-Only.

### Wave 4 — Landing and chrome

Public `/` landing (Book / Staff sign-in / Driver sign-in). Strip TailAdmin dead UI. Token-migrate layout/form. Docs sync. Location consent after book if missed. Then CSP enforce.

## 10. Architecture constraints (unchanged)

AGENTS.md module shape. Actions thin; services own `$transaction` + `writeAudit`. No `db.booking.update({ status })` outside `transitionBookingStatus` / `claimBooking`. Semantic tokens. `dynamic = "force-dynamic"` on DB layouts. Env via `src/lib/env.ts`.

## 11. Success (Wave 1 done)

Demo data, no live pay:

**Staff** — 10-digit book, reuse mobile, quoted ₹, pair vehicle, assign, WhatsApp Share, Settings not fake.

**Customer** — sign up with phone, three-step book, see ₹ estimate, land on trip page, read “Waiting for confirmation”, after assign tap Call.

**Driver** — see the job on Home or Open, Claim or open assigned trip, Call customer, Navigate opens Maps, one large “I’m on my way”.

Staff-managed guest still cannot open `/portal`.

## 12. Implementation order

This spec → Wave 1 implementation plan (staff + customer + driver) → Wave 2 (GST/pay/MFA).
