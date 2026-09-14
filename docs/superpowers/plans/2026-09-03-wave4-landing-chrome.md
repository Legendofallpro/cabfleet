# Wave 4 — Landing and chrome

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Do not commit unless the user asks. Do not start work beyond Wave 4.

**Goal:** Public `/` landing (Book / Staff sign-in / Driver sign-in), staff desk at `/dashboard`, TailAdmin dead UI gone, layout/form on semantic tokens, location consent after book if missed, then enforcing CSP.

**Architecture:** `src/app/page.tsx` is the unauthenticated landing. `(admin)/page.tsx` moves to `(admin)/dashboard/page.tsx`. `getRoleHome` for ADMIN/STAFF/SUPER_ADMIN becomes `/dashboard`. `/` is public by **exact match only** (never `startsWith("/")`). Consent is a booking field update + audit, not a status change.

**Tech Stack:** Next.js 15 App Router, existing Server Actions, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-cabfleet-go-live-program-design.md` §9 Wave 4.

## Global Constraints

- AGENTS.md: actions thin; services own `$transaction` + `writeAudit`.
- No `db.booking.update({ status })` outside `transitionBookingStatus` / `claimBooking`.
- Semantic tokens in `src/app` / `src/modules` (and layout/common/form this wave).
- No emoji. English. Env via `src/lib/env.ts`.
- Do not bump Prisma / Next / React / Tailwind.
- Do not `npm install` without `--legacy-peer-deps`.
- Do not commit unless asked.

## File map

| File | Role |
|------|------|
| `src/lib/auth/public-paths.ts` | Exact `/` plus auth prefixes; tested so `/` never opens the whole app |
| `src/lib/auth/redirects.ts` | Staff home `/dashboard`; `/` after auth is role home |
| `src/app/page.tsx` | Public landing; signed-in users `redirect(getRoleHome)` |
| `src/app/(admin)/dashboard/page.tsx` | Current staff dashboard |
| `src/middleware.ts` | Use `isPublicPath` |
| `src/modules/bookings/services/booking.service.ts` | `grantLocationConsent` |
| `src/modules/bookings/actions/customer-booking.actions.ts` | Customer action + IDOR |
| `next.config.ts` | Enforcing `Content-Security-Policy` last |

---

### Task 1: Public path helper + staff home `/dashboard`

- [x] `isPublicPath("/")` true; `isPublicPath("/dashboard")` false; `isPublicPath("/signin")` true
- [x] `getRoleHome("ADMIN"|"STAFF"|"SUPER_ADMIN")` is `/dashboard`
- [x] `getPostAuthRedirect("/", role)` is role home
- [x] Middleware uses `isPublicPath`. Do **not** put `"/"` in a prefix list.
- [x] Admin layout unauthenticated redirect `redirectTo=/dashboard`
- [x] MFA tests treat `/dashboard` as the desk (not exempt)

### Task 2: Landing + move dashboard

- [x] `src/app/page.tsx`: Book (`/signup`), Staff sign-in (`/signin?redirectTo=/dashboard`), Driver sign-in (`/signin?redirectTo=/driver`). Semantic tokens. No emoji.
- [x] Move `(admin)/page.tsx` → `(admin)/dashboard/page.tsx`. Delete the old file (two pages at `/` is a build error).
- [x] Sidebar Dashboard + logos in admin chrome → `/dashboard`
- [x] Staff-only `redirect("/")` (orgs, audit, dsr, refunds, PageBreadcrumb Home) → `/dashboard`
- [x] Auth “Back to dashboard” → “Back to home” (`href="/"`)

### Task 3: Location consent after book

- [x] Tests: IDOR NOT_FOUND; terminal VALIDATION; already-consented idempotent; stamps `locationConsentAt` + audit UPDATE; **does not** change status
- [x] Action: `requireRole(["CUSTOMER"])`, own booking
- [x] Trip page: non-terminal + `locationConsentAt === null` shows grant UI. Live map still requires ACTIVE + consent.

### Task 4: Strip TailAdmin + tokenize layout/form

- [x] Delete unused TailAdmin form/image/video files. Keep Checkbox + dropdown/table/button.
- [x] Token-migrate `AppSidebar`, `AppHeader` (remove fake Cmd+K), `DataTable`, `PageBreadcrumb`, `Checkbox`
- [x] Replace auth layout TailAdmin marketing copy
- [x] Expand `scripts/check-ui-tokens.ts` to `src/layout`, `src/components/common`, `src/components/form`

### Task 5: CSP enforce + docs (last)

- [x] Playwright expects enforcing `Content-Security-Policy` with `default-src 'self'` and no report-only
- [x] Flip `next.config.ts`. Optional `allowedDevOrigins: ["127.0.0.1"]`
- [x] Sync `docs/architecture.md` §1.3, CSP docs, spec Wave 4 status

### Task 6: Verify

- [x] `npm test` — 204 passed
- [x] `npm run typecheck`, `lint` (0 errors), `check:tokens`, `check:structure`
- [x] `npx playwright test` — CSP enforcing + landing; desk/trip skipped without `E2E_*`
