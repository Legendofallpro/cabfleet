# CabFleet open-source release — design

Date: 2026-09-20  
Status: ready for review  
Product: CabFleet (name stays CabFleet)

This spec is the first implementation slice: publish CabFleet as a generic, self-hostable dispatch app. A later spec (out of this plan) covers deeper structural refactors.

## 1. Goal

Make `github.com/Legendofallpro/taxiappv2` a public CabFleet repository that a stranger can clone, configure, and run without:

- Thinking the project is TailAdmin
- Hitting hardcoded India (INR, GSTIN, `+91`, IST) unless they chose India
- Finding the maintainer’s name, machine hostname, or personal email in files or git authors
- Missing license, security, or setup documentation

Success: CI is green (`lint`, `typecheck`, `test`, `check:tokens`, `check:structure`, `build`, Playwright landing + CSP), README describes CabFleet, `/setup` works, and git log no longer contains `shripadhharish@Shripadhs-MacBook-Air.local`.

## 2. Non-goals (this spec)

- Renaming the product (not OpenDispatch)
- Per-org or per-branch country (one country per install)
- First-class country packs (tax engines, local payment gateways besides Razorpay-for-IN)
- Rewriting modules, dropping multi-org, or replacing TailAdmin chrome beyond leftover assets/copy
- Rewriting TailAdmin contributor emails (those people already published them; MIT requires keeping their copyright notice)
- Live Razorpay/Twilio/Resend keys in the repo
- Changing booking types (Local / Outstation / Rental / Airport stay)

## 3. Decisions already locked

| Topic | Decision |
|---|---|
| Product name | CabFleet |
| Country model | Install-time primitives, not hardcoded IN |
| Who sets country | The person who deploys (one country per install) |
| Setup UX | Two-step `/setup` wizard; env fallback for CI |
| Git | Keep history; rewrite only CabFleet-era authors to a GitHub noreply; then rename GitHub repo `taxiappv2` → `cabfleet` and make it public |
| LICENSE | MIT; keep TailAdmin copyright; add CabFleet contributors |
| Internal wave docs | Remove `docs/superpowers/plans/` and the 2026-08-31 go-live spec from the public tree. This OSS spec stays. |
| Later work | Structural refactors get their own spec after this ships |

## 4. Architecture

### 4.1 `InstallSettings` singleton

New Prisma model. Not hung on `Organization` (orgs are tenants; country is install-scoped).

```
InstallSettings
  id                String   @id          // always "default"
  country           String                 // ISO 3166-1 alpha-2, e.g. IN
  currency          String                 // ISO 4217, e.g. INR
  locale            String                 // BCP 47, e.g. en-IN
  timezone          String                 // IANA, e.g. Asia/Kolkata
  phoneRegion       String                 // libphonenumber country, e.g. IN
  taxIdLabel        String                 // UI label, e.g. GSTIN / VAT / Tax ID
  taxRate           Int      @default(0)   // 0–100; 0 hides tax lines
  setupCompletedAt  DateTime?
  createdAt         DateTime
  updatedAt         DateTime
```

Exactly one row (`id = "default"`). Completing setup sets `setupCompletedAt`. There is no second row.

`Organization.gstin` stays the tax ID *value* (column name unchanged). The UI label is `InstallSettings.taxIdLabel`. Do not rename the column in this spec.

### 4.2 Module

Follow existing module layout:

```
src/modules/install/
  actions/setup.actions.ts
  services/install.service.ts
  queries/install.ts
  validators/setup.ts
  components/SetupWizard.tsx
  country-defaults.ts
  install.constants.ts      // client-safe types + labels only
```

- Actions: `require` nothing on first complete (no admin exists yet). After complete, re-running setup requires `SUPER_ADMIN` or `ADMIN`.
- Services: write `InstallSettings` + `writeAudit` in the same transaction. First complete also updates HQ `Branch.timezone` if it still equals the seed placeholder (`UTC`).
- Queries: `getInstallSettings()` for RSC / layouts. Safe to call when the row is missing (returns `null`).
- `country-defaults.ts`: map ISO country → `{ currency, locale, timezone, phoneRegion, taxIdLabel, taxRate }`. India is the richest entry (INR, en-IN, Asia/Kolkata, IN, GSTIN, 0). Unknown countries fall back to USD, en-US, UTC, US, "Tax ID", 0. A short list of extra explicit rows (GB, US, AE, AU, SG, DE) is enough; do not invent tax law.

### 4.3 Formatters

New helpers, argument-driven so they are safe in client and server code:

- `formatMoney(amount, { locale, currency })`
- `formatDateTime(date, { locale, timeZone })`

No default of `en-IN` / `INR`. Callers pass install settings (RSC) or props (client).

Add `InstallSettingsProvider` in the root layout (same role as `ThemeProvider`: display chrome, not filter state). The provider accepts `settings | null` so `/setup` and the public landing can render before the row exists. Client widgets (`DeskQueue`, `BookingTimeline`) read locale/currency/timezone from context and are only mounted on gated layouts after setup is complete.

`toE164(input)` keeps an optional region argument; the default becomes the install `phoneRegion` at the call site, not a hardcoded `"IN"` inside `phone.ts`. Change the `phone.ts` default from `"IN"` to requiring the caller to pass a region (breaking, explicit). Notification + form callers pass `settings.phoneRegion`.

### 4.4 Setup gating (no Prisma in middleware)

Middleware stays Edge + Supabase. It does **not** query `InstallSettings`.

- Add `/setup` to `PUBLIC_PATH_PREFIXES`. Rate-limit it like `/signup`.
- Public landing (`/`): if settings are missing/incomplete, redirect to `/setup`.
- `(admin)`, `(driver)`, `(customer)` layouts: if settings incomplete, redirect to `/setup`.
- After complete, visiting `/setup` as a non-admin redirects to `/signin` (or role home if signed in). Admin may reopen it from Settings.

CI / Playwright: seed writes a completed `InstallSettings` row from env (see §7) so tests never see the wizard unless a dedicated spec opts in.

### 4.5 First-run security

`/setup` is writable only while `setupCompletedAt` is null, **or** by `ADMIN` / `SUPER_ADMIN` afterwards.

If `SETUP_SECRET` is set in env, the wizard’s first complete must include that secret (constant-time compare). Production should set it. Local dev may leave it unset. CI does not use the wizard.

### 4.6 RLS

New table follows the deny-PostgREST pattern: `ENABLE` + `FORCE ROW LEVEL SECURITY`, restrictive `deny_direct_api_access`, `REVOKE ALL FROM anon, authenticated`.

Do **not** edit the already-applied `20260914150000_rls_force_deny_postgrest` migration. Add a new Prisma migration that creates `InstallSettings` and the RLS statements.

Update `scripts/check-rls-coverage.ts` to search **all** files under `prisma/migrations/` for each model name, so new tables are not forced into an old migration.

Also add a matching block in `prisma/sql/16_rls_install_settings.sql` for operators who apply SQL by hand.

## 5. Two-step `/setup` wizard

Unauthenticated, no admin chrome, same visual language as `/` (single column, large fields, `max-w-md`).

**Step 1 — “Where does this fleet run?”**

- Searchable country `<SelectField>` (ISO 3166-1 names).
- Continue.

**Step 2 — “Review install defaults”**

- Country (read-only; Back returns to step 1).
- Currency, locale, timezone, phone region, tax ID label, tax rate — all prefilled from `country-defaults.ts`, all editable.
- If `SETUP_SECRET` is configured, a secret field.
- Save and continue.

Save calls `completeSetupAction`. On success: set `setupCompletedAt`, audit log, update HQ timezone if still `UTC`, `revalidatePath("/")`, redirect to `/signin`.

`react-hook-form` + `zodResolver` using the same schema as the action. Form values type is `z.input<typeof schema>`.

Country change on step 1 resets step 2 fields to that country’s defaults (operator can still edit).

## 6. Country-specific product behavior

| Area | Rule |
|---|---|
| Money / dates | Always from `InstallSettings` via formatters. Replace hardcoded `en-IN`, `INR`, `₹`, `Asia/Kolkata` in `src/app/**` and `src/modules/**`. |
| Phones | `toE164(value, settings.phoneRegion)`. Desk “10-digit mobile” copy and validators: if `phoneRegion === "IN"`, keep 10-digit local input; otherwise accept E.164 or national format for that region. |
| Tax ID | Label from `taxIdLabel`. Value still stored in `Organization.gstin`. Validate with the GSTIN regex **only** when `country === "IN"`; otherwise max-length trimmed string (32). |
| Tax rate | `Organization.gstRate` allowed 0–100 (not only 0/5/12). Rate 0 still hides tax lines. Setup copies `taxRate` onto the default org once. |
| Razorpay | Checkout, CSP extras, Settings payment copy, and provider selection: only when `country === "IN"` **and** Razorpay env keys are present. Otherwise Manual only. Hide Razorpay from Settings when country is not IN. |
| Twilio | Default `TWILIO_ALLOWED_COUNTRIES` to the install country, not hardcoded `IN`. |
| Email | `MAIL_FROM` env (e.g. `CabFleet <noreply@example.com>`). Stop hardcoding `noreply@cabfleet.app`. Product name in templates stays CabFleet. |
| Profile locale dropdown | Build options from install locale plus a small English list; do not ship only `en-IN` / `hi-IN`. Timezone dropdown includes the install timezone first. |
| Seed | Default org + HQ branch + booking types remain. HQ timezone is `UTC` until setup (or CI env) sets it. Do not seed `Asia/Kolkata` unless install country is IN. |

India remains the richest path: GSTIN regex, Razorpay, 10-digit desk phones. Other countries get primitives + Manual payments + generic tax line.

## 7. Env additions

`.env.example` documents:

```
# First-run. Optional locally. Set in production so a public URL cannot complete setup.
SETUP_SECRET=""

# CI / Playwright only. When set, prisma/seed.ts writes a completed InstallSettings row.
INSTALL_COUNTRY="IN"
INSTALL_CURRENCY="INR"
INSTALL_LOCALE="en-IN"
INSTALL_TIMEZONE="Asia/Kolkata"
INSTALL_PHONE_REGION="IN"
INSTALL_TAX_ID_LABEL="GSTIN"
INSTALL_TAX_RATE="0"

# Invoice / notification From header
MAIL_FROM="CabFleet <noreply@localhost>"
```

CI workflow sets the `INSTALL_*` values (India is fine as the CI preset) so seed + e2e do not depend on the wizard. `SKIP_ENV_VALIDATION` stays as today.

`src/lib/env.ts` reads `SETUP_SECRET` (optional), `MAIL_FROM` (optional with a CabFleet default), and does **not** require `INSTALL_*` at runtime (seed-only).

## 8. Open-source hygiene

### 8.1 README

Replace the TailAdmin marketing README. CabFleet README must include:

- What it is (staff desk, customer portal, driver portal)
- Architecture one-liner (Next.js App Router, Prisma, Supabase)
- Features list (booking state machine, claim, invoices, GST-capable tax line, Razorpay optional for India)
- Requirements (Node 20, Supabase project, Postgres)
- Setup: copy env, `npm ci --legacy-peer-deps`, `prisma generate`, `migrate`, paste profile-sync SQL, seed, `npm run dev`, open `/setup`, then `/signup` and promote to ADMIN
- Demo scripts (`scripts/create-demo-desk.ts`) 
- Tests (`npm test`, `npm run test:e2e`)
- Link to `docs/architecture.md`, `docs/web-app-security.md`, `docs/api/README.md`
- License (MIT) and TailAdmin attribution one-liner
- Security: `SECURITY.md`

Remove `banner.png` if it is TailAdmin artwork. No TailAdmin download/pricing links.

`package.json`: `"name": "cabfleet"`, `"private": false`, `"license": "MIT"`. Keep `--legacy-peer-deps` in README because of `nuqs`.

### 8.2 LICENSE

MIT. Copyright lines:

```
Copyright (c) 2023 TailAdmin
Copyright (c) 2026 CabFleet contributors
```

Do not put a personal name in LICENSE.

### 8.3 Community files

Add:

- `CONTRIBUTING.md` — Node 20, `--legacy-peer-deps`, `npm run lint && npm run typecheck && npm test`, module layout pointer to `AGENTS.md`, no secrets in PRs
- `SECURITY.md` — report vulnerabilities via GitHub private reporting (or a SUPPORT_EMAIL); never file secrets in issues
- `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1

### 8.4 TailAdmin leftovers

- Strip “TailAdmin” from `src/app/not-found.tsx`, `src/app/(full-width-pages)/(error-pages)/error-404/page.tsx` metadata and footers. Use CabFleet.
- Delete unused `public/images/brand/`, `public/images/country/`, `public/images/video-thumb/`, `public/images/task/` if nothing in `src/` references them (current tree: no references).
- Keep used logos, error illustrations, and `src/icons`.
- AGENTS.md: remove the stale “ApexCharts / FullCalendar still in package.json” bullet (those packages are already gone). Fix “Next.js 15” → 16 to match `package.json`.

### 8.5 Docs rewrite

- `docs/architecture.md`: rewrite as **current state**, not the original phased plan. Remove “No Prisma yet”, “MFA not implemented”, “MVP ships ManualPaymentProvider only”, Next 15. Keep the booking state machine, module rules, and dispatch strategy — those are still true.
- `AGENTS.md`: Next 16, current CI commands, InstallSettings + `/setup` as a hard rule (do not hardcode `en-IN` / `INR` / `"IN"` in feature code).
- Delete `docs/superpowers/plans/` (four wave plans) and `docs/superpowers/specs/2026-08-31-cabfleet-go-live-program-design.md`. Keep this spec.

## 9. PII and git history

### 9.1 Working tree

No maintainer personal email or GitHub handle in source, docs, or seeds. Placeholders stay:

- `staff.demo@cabfleet.local` / `driver.demo@cabfleet.local` / `customer.demo@cabfleet.local`
- Form placeholders `you@example.com`
- Test phones `+919876543210` etc. (fictitious)

`scripts/create-demo-*.ts` keep `.cabfleet.local` addresses.

### 9.2 Author rewrite

Keep TailAdmin history. Rewrite **only** commits currently authored as `Shripadh Harish <shripadhharish@Shripadhs-MacBook-Air.local>` (and any other `*MacBook*` / `shripadhharish@` author strings) to:

```
CabFleet contributors <ID+Legendofallpro@users.noreply.github.com>
```

Use GitHub’s noreply so the public log has no machine hostname and no personal inbox. The exact `ID+login` string is taken from GitHub at implementation time (`gh api user` once the `gh` CLI is available).

Tool: `git filter-repo` (or `git filter-branch` only if filter-repo is unavailable) with a mailmap. This is a history rewrite.

Order: **all feature work and tests land on `main` first**, then one rewrite, then force-push to the still-private origin, then rename, then public.

Because origin already has `main`, the rewrite needs `--force` push. Do it only while the repo is private. Do not force-push after it is public. Coordinate: no open clones expected besides this machine.

Do not rewrite TailAdmin authors (`mosarrof121@gmail.com`, `naim.pimjo@gmail.com`, etc.).

### 9.3 GitHub

1. Rewrite authors locally, verify `git log --format='%an <%ae>' | sort -u` has no MacBook / shripadhharish strings.
2. `git push --force-with-lease origin main` while private.
3. Rename `Legendofallpro/taxiappv2` → `Legendofallpro/cabfleet`.
4. Add MIT topics (`nextjs`, `supabase`, `prisma`, `fleet`, `dispatch`) and a short description.
5. Make the repository public.
6. Turn on GitHub private vulnerability reporting.

If rename fails (name taken), keep `taxiappv2` as a last resort and set the README title to CabFleet. Do not create a second remote with squashed history.

## 10. Testing and verification

### 10.1 New unit tests

- `country-defaults.ts`: IN → INR/GSTIN/Asia/Kolkata; unknown → USD/UTC/Tax ID.
- `completeSetup`: first write succeeds; second write without admin fails; `SETUP_SECRET` mismatch fails; HQ timezone updates from UTC.
- `formatMoney` / `formatDateTime` for IN vs US.
- GST validator: IN requires GSTIN shape; US accepts free-text tax ID.
- Payments provider index: non-IN never returns Razorpay even if keys are set.
- `toE164` callers pass region; phone.test covers IN and US defaults.
- `isPublicPath("/setup")`.
- RLS coverage script still passes with `InstallSettings`.

### 10.2 Existing tests

Update any test that assumed hardcoded `en-IN` / `Asia/Kolkata` / `toE164` default IN **only where the production default changed**. Profile locale tests should pass an explicit timezone.

### 10.3 E2E

- Existing landing + CSP specs stay. CI seed completes setup via `INSTALL_*`, so those specs never see the wizard.
- Wizard coverage in CI is **unit/integration tests of `completeSetup`** (first write, secret, second write, HQ timezone). Do not add a second database to CI.
- Optional local Playwright `e2e/setup.spec.ts` is skipped unless `E2E_FORCE_SETUP=true` (operator points it at a DB whose `InstallSettings.setupCompletedAt` is null). Default `npm run test:e2e` in CI does not set that flag.
- Live `desk-book` / `trip-loop` remain skipped without `E2E_*` credentials.

### 10.4 Verification commands (must be green before rewrite/public)

```
npm run lint
npm run typecheck
npm test
npm run check:tokens
npm run check:structure
SKIP_ENV_VALIDATION=true DATABASE_URL=... npm run build
npm run test:e2e          # landing + csp; setup spec if tagged
```

No claim of “everything works” without this output.

## 11. Error handling

- Incomplete setup on a gated layout → redirect `/setup`, not a 500.
- Invalid country / currency / timezone → zod field errors on the wizard.
- Duplicate complete without admin → `AppError` `CONFLICT`.
- Missing `SETUP_SECRET` in production: app still boots; completing setup without a secret is allowed (documented as insecure). Operators who set the secret are protected. Do not refuse boot — first-run would deadlock.
- `getInstallSettings()` null in a formatter path → throw `AppError` `PRECONDITION` in admin/driver/customer; public landing already redirected.

## 12. Follow-up spec (do not implement now)

Candidates for a later “CabFleet structural cleanup” spec:

- Hide `/orgs` UI when `MULTI_ORG_ENABLED=false`
- Complete `scripts/check-structure.ts` `MODEL_OWNER` (org, tracking, notifications, profile, DSR)
- Collapse duplicate theme toggles (`ThemeTogglerTwo` vs `ThemeToggleButton`)
- Generate profile locale/timezone lists solely from install + Intl
- Per-country payment providers beyond Razorpay-for-IN
- Move remaining TailAdmin layout files behind a thinner admin shell

## 13. Implementation order

1. Hygiene: README, LICENSE, community files, TailAdmin copy/assets, AGENTS.md + architecture.md, delete old superpowers plans, `package.json` license/private, `.gitignore` already includes `.superpowers/`.
2. `InstallSettings` migration + RLS + coverage script fix + seed `INSTALL_*`.
3. `country-defaults`, formatters, provider, `toE164` caller updates, GST/Razorpay gates, `MAIL_FROM`.
4. `/setup` two-step wizard + public path + layout redirects.
5. Replace hardcoded locale/currency/phone in app/module UI.
6. Tests (unit + e2e setup page) + run the verification commands.
7. Git author rewrite, force-push while private, rename repo, make public.

Do not mix step 7 with feature commits.

## 14. Files expected to change (non-exhaustive)

- `prisma/schema.prisma`, new migration, `prisma/seed.ts`, `prisma/sql/16_rls_install_settings.sql`, `scripts/check-rls-coverage.ts`
- `src/modules/install/**` (new)
- `src/lib/format/**` (new), `src/lib/utils/phone.ts`, `src/lib/env.ts`, `src/lib/email.ts`, `src/lib/auth/public-paths.ts`
- `src/app/setup/**` (new), `src/app/page.tsx`, admin/driver/customer layouts, `src/app/layout.tsx` (provider)
- `src/modules/orgs/validators/org.ts`, payments provider index, Razorpay checkout, invoice PDF, settings GST page
- Many `en-IN` / `INR` call sites listed by search under `src/app` and `src/modules`
- `README.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `package.json`, `docs/architecture.md`, `AGENTS.md`
- Delete TailAdmin unused public images and old `docs/superpowers/plans/*` plus the 2026-08-31 go-live spec
- `.github/workflows/ci.yml` (`INSTALL_*` env for seed if CI ever seeds; unit tests should not need a real DB)

## 15. Risks

- History rewrite + force-push: only while private; verify authors before push.
- `InstallSettings` in root provider: root layout must stay a server component that loads settings and passes them into a client provider. Do not import `db` into a `"use client"` file.
- Loosening `gstRate` from `{0,5,12}` to 0–100 changes invoice math for non-India; rate 0 remains “no tax lines”.
- Playwright `/setup` must not fight the CI seed that completes setup.
