# Wave 1 — Desk + Customer + Driver Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans (tightly coupled). Tasks are sequential: schema → services → UI.

**Goal:** Staff can book from a 10-digit mobile; customers can self-book a trip on a phone-easy wizard; drivers can Call / Navigate / next-status with one thumb. Sandbox only.

**Architecture:** Existing CabFleet module shape. New columns on `Customer`, `Profile`, `Booking`. `findOrCreateStaffCustomer` in customers. Desk and portal both call `createBooking`. No `db.booking.update({ status })` outside `transitionBookingStatus` / `claimBooking`.

**Tech Stack:** Next.js App Router, Prisma 7, Zod, RHF, Vitest, semantic tokens.

**Spec:** `docs/superpowers/specs/2026-08-31-cabfleet-go-live-program-design.md`

## Global Constraints

- Semantic tokens only in `src/app/**` and `src/modules/**` (no `bg-brand-*`, no emoji in customer chrome).
- `z.input<>` for forms; `requirePermission` first line of every action; `writeAudit` in the same `$transaction`.
- `toE164(..., "IN")` for phones. Staff-managed email domain: `staff.cabfleet.invalid`.
- Customer status copy lives in `booking.constants.ts` (client-safe).
- Do not implement Wave 2 (GST, Razorpay pay, MFA enforce).

---

### Task 1: Schema

**Files:**
- Modify: `prisma/schema.prisma` (Profile.phone `@unique`, Customer.staffManaged, Booking landmarks/toll/parking/notes)
- Create: `prisma/migrations/20260831120000_wave1_desk_fields/migration.sql`

- [ ] Add columns and unique phone
- [ ] `npx prisma generate`
- [ ] `npx prisma migrate deploy` (or `migrate dev`) against local DB

### Task 2: Staff-managed customers

**Files:**
- Create: `src/modules/customers/staff-managed.ts` (domain + email helper)
- Create: `src/modules/customers/validators/customer.ts`
- Modify: `src/modules/customers/services/customer.service.ts`
- Create: `src/modules/customers/queries/customer-by-phone.ts`
- Create: `src/modules/customers/actions/customer.actions.ts`
- Create: `src/modules/customers/services/customer.service.test.ts`

Produces: `findOrCreateStaffCustomer({ phone, fullName }, actor) → Result<CustomerRow>`

### Task 3: Booking create/update extras

**Files:**
- Modify: `src/modules/bookings/validators/booking.ts` (quotedFare, toll, parking, landmarks, notes, desk phone)
- Modify: `src/modules/bookings/services/booking.service.ts` (`createBooking`, `updatePendingBooking`)
- Modify: `src/modules/bookings/services/transitionBookingStatus.ts` (set `fareFinal` on COMPLETED)
- Modify: `src/modules/bookings/actions/booking.actions.ts`
- Modify: `src/modules/bookings/booking.constants.ts` (`CUSTOMER_STATUS_LABEL`)
- Tests: pending-update guards, fareFinal on complete

### Task 4: Pricing + booking-type admin + Settings hub

**Files:**
- Create: `src/modules/pricing/validators/pricing-rule.ts`, `services/pricing-rule.service.ts`, `actions/pricing-rule.actions.ts`, `queries/pricing-rule.ts`, components/forms
- Create: `src/modules/bookings/validators/booking-type.ts`, service/actions/queries for types
- Pages: `src/app/(admin)/settings/pricing/page.tsx`, `settings/booking-types/page.tsx`
- Modify: `src/app/(admin)/settings/page.tsx`, `src/layout/AppSidebar.tsx`
- Fix: `src/app/(admin)/reports/page.tsx` `toStr`

### Task 5: Desk booking UI + WhatsApp Share + vehicle assignment

**Files:**
- Rebuild: `src/modules/bookings/components/BookingCreateForm.tsx`
- Create: `WhatsAppShareButton.tsx`, `AssignVehicleForm.tsx` (driver detail)
- Modify: booking detail page, driver `[id]` page, `booking.actions.ts` for desk create

### Task 6: Customer app

**Files:**
- `src/lib/auth/validators.ts` + `SignUpForm.tsx` (phone; reject `.invalid`)
- `src/app/(customer)/layout.tsx` (bottom nav, no emoji; block staffManaged)
- `portal/page.tsx`, `CustomerBookingForm.tsx` (live estimate), bookings list/detail, profile

### Task 7: Driver app

**Files:**
- `src/app/(driver)/driver/page.tsx`, `trips/open/page.tsx`, `trips/[id]/page.tsx`
- Create: `TripActionBar.tsx` (Call, Navigate, primary status)

### Task 8: Verify

- `npm run typecheck`, `npm test`, `npm run lint`, `npm run check:tokens`, `npm run check:structure`
