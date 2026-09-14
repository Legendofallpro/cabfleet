# Wave 2 — Money, GST bill, trust

> **For agentic workers:** Use superpowers:executing-plans (tightly coupled). Tasks are sequential: GST schema → invoice PDF → auto-invoice → customer Pay now → MFA aal2 → audit viewer → notifications nav.

**Goal:** Staff can record cash/UPI; customers can Pay now (Razorpay test, server amount); completing a trip issues a GST-shaped invoice PDF; staff/admin sessions require AAL2; audit log and notifications are reachable from the sidebar.

**Architecture:** Existing payments + invoices modules. GSTIN/rate live on `Organization` and are snapshotted onto `Invoice` at issue time. `generateInvoice` stays the only PDF writer. Customer checkout is a new action with IDOR + server-computed outstanding. MFA is enforced in the admin layout, not middleware (middleware has no Profile.role). No `db.booking.update({ status })` outside `transitionBookingStatus` / `claimBooking`.

**Tech Stack:** Next.js App Router, Prisma 7, Razorpay Checkout (existing provider), `@react-pdf/renderer`, Supabase MFA, semantic tokens.

**Spec:** `docs/superpowers/specs/2026-08-31-cabfleet-go-live-program-design.md` §8–9 Wave 2.

## Global Constraints

- Semantic tokens only in `src/app/**` and `src/modules/**`.
- `requirePermission` / `requireRole` first line of every action; `writeAudit` in the same `$transaction`.
- Env via `src/lib/env.ts`. `PAYMENT_GATEWAY=MANUAL` hides customer Pay now; Razorpay test keys only.
- GST rate 0 hides tax lines. SAC 9964. GSTIN optional.
- Customer Pay now amount is looked up server-side (never trust the client).
- Do not implement Wave 3 (Playwright, CSP enforce) or Wave 4 (public landing).

---

### Task 1: GST fields on Organization + Invoice

**Files:**
- Modify: `prisma/schema.prisma` (`Organization.gstin`, `Organization.gstRate`; `Invoice.gstin`, `Invoice.gstRate`, `Invoice.sacCode`)
- Create: `prisma/migrations/20260903120000_wave2_gst_fields/migration.sql`
- Create: `src/modules/invoices/gst.ts` (pure breakdown helper)
- Test: `src/modules/invoices/gst.test.ts`

- [ ] Add columns; `npx prisma generate`
- [ ] `gstBreakdown({ transport, toll, parking, gstRate })` → taxable, gst, extras, total; rate 0 → gst 0

### Task 2: GST settings + GST-shaped PDF

**Files:**
- Modify: `src/modules/orgs/validators/org.ts`, `services/org.service.ts`, `actions/org.actions.ts` (`updateOrgGst` for ADMIN of own org)
- Create: `src/app/(admin)/settings/gst/page.tsx` + form component
- Modify: `src/app/(admin)/settings/page.tsx`, `src/layout/AppSidebar.tsx`
- Modify: `src/modules/invoices/services/invoice-pdf.tsx`, `generateInvoice.ts`

- [ ] Settings GSTIN + rate 0/5/12
- [ ] PDF: transport SAC 9964, toll/parking lines, GST line if rate > 0, snapshot gstin/rate on Invoice

### Task 3: Auto-invoice on COMPLETED

**Files:**
- Create: `src/modules/invoices/services/maybeGenerateOnComplete.ts`
- Modify: `src/modules/bookings/actions/booking.actions.ts` (`transitionBookingAction`)
- Modify: `src/modules/bookings/actions/driver-booking.actions.ts` (`driverTransitionAction`)

- [ ] After a successful COMPLETED transition, call `generateInvoice`. CONFLICT (already invoiced) is success. Other errors are logged; they must not fail the trip complete.

### Task 4: Customer Pay now (IDOR + server amount)

**Files:**
- Modify: `src/modules/payments/queries/payment.ts` (`sumCapturedForBooking`)
- Create: customer checkout action in `src/modules/payments/actions/payment.actions.ts`
- Create: `src/modules/payments/components/PayNowButton.tsx`
- Modify: `src/app/(customer)/portal/bookings/[id]/page.tsx`

- [ ] Outstanding = fareFinal (else estimate+extras) + GST − CAPTURED payments
- [ ] Action: `requireRole(["CUSTOMER"])`, booking must belong to actor, amount not client-supplied
- [ ] Show Pay now only when outstanding > 0 and `PAYMENT_GATEWAY=RAZORPAY`
- [ ] Staff cash/UPI path (`RecordPaymentForm`) already exists — keep CASH/UPI as defaults

### Task 5: MFA aal2 for ADMIN / STAFF / SUPER_ADMIN

**Files:**
- Modify: `src/lib/auth/session.ts` or new `src/lib/auth/aal.ts`
- Modify: `src/app/(admin)/layout.tsx`
- Modify: `src/app/(admin)/profile/account/page.tsx` (banner when `?mfa=required`)

- [ ] If current AAL ≠ aal2, redirect to `/profile/account?mfa=required` except that page (and `/profile`)
- [ ] DRIVER and CUSTOMER are not forced

### Task 6: Audit viewer + notifications nav

**Files:**
- Create: `src/modules/audit/queries/audit.ts`
- Create: `src/app/(admin)/audit/page.tsx`
- Modify: `src/layout/AppSidebar.tsx` (Audit, Notifications)
- Modify: `scripts/check-structure.ts` if `auditlog` owner needed

- [ ] `requirePermission(AUDIT_VIEW)` on the page (ADMIN; STAFF does not have it)
- [ ] Table: at, actor, entity, entityId, action. Search by entity / entityId
- [ ] Sidebar: Notifications → `/notifications`, Audit → `/audit`

### Task 7: Verify

- `npx prisma generate`
- `npm run typecheck`, `npm test`, `npm run lint`, `npm run check:tokens`, `npm run check:structure`
