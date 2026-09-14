# Wave 3 — Reliability

> **For agentic workers:** Use superpowers:executing-plans. Tasks: vitest env bootstrap → MFA gate helper for e2e → Playwright CSP smoke (always) → Playwright desk + trip loop (skip without credentials). Do not flip CSP to enforce. Do not start Wave 4.

**Goal:** `npm test` works with no shell env vars. Playwright covers CSP report-only on `/signin`, a desk phone-book path, and customer-book → staff-assign → driver-complete → invoice when E2E credentials exist.

**Architecture:** Vitest `setupFiles` injects the same placeholders CI already uses. Staff AAL2 stays on by default; Playwright's webServer sets `STAFF_AAL2_REQUIRED=false` so the loop is not blocked by TOTP. Live e2e tests `test.skip` when `E2E_*` emails are unset so CI without Supabase still goes green. CSP header remains `Content-Security-Policy-Report-Only`.

**Tech Stack:** Vitest, Playwright Chromium, Next.js `next start` as webServer.

**Spec:** `docs/superpowers/specs/2026-08-31-cabfleet-go-live-program-design.md` §9 Wave 3.

## Global Constraints

- AGENTS.md: no `process.env` in app code except `src/lib/env.ts` (and `src/lib/csp.ts` / `next.config.ts` as already allowed).
- `npm install` only with `--legacy-peer-deps`.
- Semantic tokens in `src/app` / `src/modules`.
- No `db.booking.update({ status })` outside the state machine.
- CSP stays Report-Only.

---

### Task 1: Vitest env bootstrap

**Files:**
- Create: `src/test/env-bootstrap.ts`
- Modify: `vitest.config.ts`

- [ ] Set placeholder `DATABASE_URL`, Supabase keys, `AUTH_PROOF_SECRET` (32+ chars), `SKIP_ENV_VALIDATION=true` only when unset
- [ ] `npm test` with an empty env (aside from PATH) still collects and passes unit tests

### Task 2: Staff AAL2 can be disabled for e2e

**Files:**
- Modify: `src/lib/env.ts`
- Create: `src/lib/auth/aal-paths.ts` already exists — add `staffMustChallengeAal2`
- Modify: `src/lib/auth/aal.test.ts`, `src/app/(admin)/layout.tsx`

- [ ] `STAFF_AAL2_REQUIRED` defaults true
- [ ] Layout skips the bounce when false

### Task 3: Playwright CSP smoke (always on)

**Files:**
- Create: `playwright.config.ts`, `e2e/csp.spec.ts`, `e2e/helpers/auth.ts`
- Modify: `package.json`, `.gitignore`, `tsconfig.json` (exclude `e2e`), `.github/workflows/ci.yml`

- [ ] Assert `/signin` sends `Content-Security-Policy-Report-Only` containing `default-src 'self'`
- [ ] Assert there is **no** enforcing `Content-Security-Policy` header
- [ ] CI installs Chromium and runs `npm run test:e2e` after build

### Task 4: Playwright desk + trip loop (credential-gated)

**Files:**
- Create: `e2e/desk-book.spec.ts`, `e2e/trip-loop.spec.ts`

- [ ] Desk: sign in as staff → `/bookings/new` → 10-digit mobile + name + Local + addresses → Save booking → URL `/bookings/{id}`
- [ ] Loop: customer books Local → staff assigns first driver/vehicle → driver I'm on my way → Start Trip → Complete Trip → customer sees Trip completed and Download invoice
- [ ] Skip both files when `E2E_STAFF_EMAIL` (desk) / all three `E2E_*` (loop) are missing

### Task 5: Verify

- `npm test` with no extra env
- `npm run typecheck`, `npm run lint`, `npm run check:tokens`, `npm run check:structure`
- `npx playwright test e2e/csp.spec.ts` against `next start` (CI env) or reuse local `next dev`
