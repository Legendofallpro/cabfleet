# CabFleet Open-Source Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish CabFleet as a self-hostable MIT repo: TailAdmin leftovers gone, install-time country via a two-step `/setup` wizard, maintainer PII removed from git authors, tests green.

**Architecture:** One `InstallSettings` singleton (not org-scoped) drives locale, currency, timezone, phone region, and tax-id label. `/setup` is public until completed. Formatters take `{ locale, currency, timeZone }` as arguments. Razorpay and GSTIN regex apply only when `country === "IN"`. History rewrite is the last task, after all feature commits.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Vitest, Playwright, Supabase Auth, existing TailAdmin-derived UI primitives (`SelectField`, semantic tokens).

**Spec:** [docs/superpowers/specs/2026-09-20-cabfleet-oss-release-design.md](../specs/2026-09-20-cabfleet-oss-release-design.md)

## Global Constraints

- Product name stays **CabFleet**. Do not rename the package to OpenDispatch.
- One country per **install**, not per org or branch.
- `Organization.gstin` column name stays; UI label comes from `InstallSettings.taxIdLabel`.
- Do not edit the applied migration `prisma/migrations/20260914150000_rls_force_deny_postgrest/`.
- `InstallSettings` is **not** in `TENANT_SCOPED_MODELS` (`src/lib/org-context.ts`). Do not add `orgId` to it.
- Do not import `db`, `@/lib/auth/*`, or `next/headers` into `"use client"` files. Put client-safe types in `src/modules/install/install.constants.ts`.
- No `en-IN` / `INR` / `₹` / `Asia/Kolkata` / default `toE164(..., "IN")` in new feature code except as India's **catalog defaults** in `country-defaults.ts` and CI seed env.
- Forms: `z.input<typeof schema>`, `useWatch` not `watch()`, `<TextField>` / `<SelectField>`.
- UI: semantic tokens only in `src/app/**` and `src/modules/**`. No arbitrary Tailwind, no `bg-brand-*`.
- `npm install` always with `--legacy-peer-deps`.
- Every mutation that writes `InstallSettings` also `writeAudit` in the same `$transaction`.
- Do **not** implement follow-up spec items (hide `/orgs`, structure-guard MODEL_OWNER expansion, theme-toggle collapse, country payment packs).
- Delete only the **four old wave plans** plus the 2026-08-31 go-live spec. Keep this plan file and `docs/superpowers/specs/2026-09-20-cabfleet-oss-release-design.md`.
- History rewrite (Task 11) runs only after Tasks 1–10 are committed and verification is green. Force-push only while the GitHub repo is still private.
- Work on a feature branch / worktree, not `main`.
- `INSTALL_GATE` env (default true) controls `/setup` redirects. CI sets `INSTALL_GATE=false` so Playwright landing/CSP keep working without Postgres.

---

## File structure

| Path | Responsibility |
|---|---|
| `src/modules/install/country-defaults.ts` | ISO country → currency/locale/timezone/phone/tax defaults |
| `src/modules/install/install.constants.ts` | Client-safe `InstallSettingsView` type + country option list |
| `src/modules/install/validators/setup.ts` | Zod schema for complete-setup |
| `src/modules/install/queries/install.ts` | `getInstallSettings()` |
| `src/modules/install/services/install.service.ts` | `completeSetup` |
| `src/modules/install/actions/setup.actions.ts` | Server action |
| `src/modules/install/components/SetupWizard.tsx` | Two-step client form |
| `src/modules/install/components/InstallSettingsProvider.tsx` | Client context |
| `src/app/setup/page.tsx` | Public setup route |
| `src/lib/format/money.ts` | `formatMoney` |
| `src/lib/format/datetime.ts` | `formatDateTime` |
| `prisma/schema.prisma` | `InstallSettings` model |
| `prisma/migrations/20260920120000_install_settings/` | Table + RLS |
| `scripts/check-rls-coverage.ts` | Scan **all** migrations |
| `README.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md` | OSS surface |

---

### Task 1: Open-source hygiene (docs, license, TailAdmin leftovers)

**Files:**
- Create: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`
- Modify: `README.md`, `LICENSE`, `package.json`, `AGENTS.md`, `docs/architecture.md`, `src/app/not-found.tsx`, `src/app/(full-width-pages)/(error-pages)/error-404/page.tsx`, `src/components/auth/SignInForm.tsx`, `src/components/auth/ResetPasswordRequestForm.tsx`
- Delete: `docs/superpowers/plans/2026-08-31-wave1-desk-customer-driver.md`, `docs/superpowers/plans/2026-09-03-wave2-money-gst-trust.md`, `docs/superpowers/plans/2026-09-03-wave3-reliability.md`, `docs/superpowers/plans/2026-09-03-wave4-landing-chrome.md`, `docs/superpowers/specs/2026-08-31-cabfleet-go-live-program-design.md`, unused `public/images/brand/`, `public/images/country/`, `public/images/video-thumb/`, `public/images/task/`, `banner.png` (if present)
- Keep: this plan file and `docs/superpowers/specs/2026-09-20-cabfleet-oss-release-design.md`

**Interfaces:** none (docs-only).

- [ ] **Step 1: Confirm unused image dirs have no `src/` references**

Run: `rg -l "images/brand|images/country|images/video-thumb|images/task|banner.png" src public README.md || true`

Expected: no matches under `src/`. If a match exists, do **not** delete that file; report BLOCKED.

- [ ] **Step 2: Replace README.md**

Write `README.md`:

```markdown
# CabFleet

Staff desk, customer portal, and driver portal for cab dispatch. Next.js App Router, Prisma, and Supabase.

This is not the TailAdmin dashboard template. CabFleet started from TailAdmin’s MIT UI and is a working fleet product.

## Features

- Phone-first staff booking desk
- Customer self-serve book + trip status
- Driver claim / assigned trips
- Booking state machine (`transitionBookingStatus` / `claimBooking` only)
- Optional Razorpay checkout when the install country is India
- PDF invoices with a configurable tax-ID line
- First-run `/setup` wizard (country, currency, timezone, phone region)

## Requirements

- Node.js 20
- A Supabase project (Auth + Postgres)
- `npm ci --legacy-peer-deps` (`nuqs` has a stale peer dep)

## Setup

```bash
cp .env.example .env.local   # fill Supabase + DATABASE_URL + DIRECT_URL + AUTH_PROOF_SECRET
npm ci --legacy-peer-deps
npx prisma generate
npx prisma migrate dev
# Paste prisma/sql/01_profile_sync.sql (and later numbered SQL as needed) in the Supabase SQL editor
npx prisma db seed
npm run dev
```

Open `/setup`, pick the country this install runs in, then `/signup`. Promote yourself:

```sql
update public."Profile" set role = 'ADMIN' where email = 'you@example.com';
```

Demo accounts (after seed + setup): `npx tsx scripts/create-demo-desk.ts`

## Tests

```bash
npm test
npm run lint
npm run typecheck
npm run test:e2e          # landing + CSP; live desk/trip specs skip without E2E_* creds
```

## Docs

- [Architecture](docs/architecture.md)
- [Web app security](docs/web-app-security.md)
- [REST v1](docs/api/README.md)
- [UI tokens](docs/ui-styling.md)
- [Agent conventions](AGENTS.md)

## License

MIT. Includes UI originally released by TailAdmin under MIT. See `LICENSE`.

## Security

See [SECURITY.md](SECURITY.md).
```

- [ ] **Step 3: LICENSE dual copyright**

Replace the copyright line block at the top of `LICENSE` with:

```
Copyright (c) 2023 TailAdmin
Copyright (c) 2026 CabFleet contributors
```

Keep the rest of the MIT text. Do not add a personal name.

- [ ] **Step 4: package.json**

Set `"private": false` and `"license": "MIT"`. Keep `"name": "cabfleet"`.

- [ ] **Step 5: Community files**

`CONTRIBUTING.md`: Node 20, `npm ci --legacy-peer-deps`, run `npm run lint && npm run typecheck && npm test` before PRs, follow `AGENTS.md` module layout, never commit `.env.local` or secrets.

`SECURITY.md`: report via GitHub private vulnerability reporting; do not file secrets in issues; `SUPPORT_EMAIL` is for operators not vuln reports.

`CODE_OF_CONDUCT.md`: Contributor Covenant 2.1, enforcement contact = GitHub private vulnerability reporting on this repo.

- [ ] **Step 6: Strip TailAdmin copy**

In `src/app/not-found.tsx` and `src/app/(full-width-pages)/(error-pages)/error-404/page.tsx` replace footer `TailAdmin` with `CabFleet`. Error-404 metadata title/description: `Not found | CabFleet` / `This page does not exist.`.

Sign-in and reset-password placeholders: `you@example.com` (not `you@cabfleet.com`).

- [ ] **Step 7: AGENTS.md**

- Change “Next.js 15” to “Next.js 16”.
- Remove the bullet about Calendar/ApexCharts/FullCalendar/jvectormap still being in `package.json`.
- Add a hard rule: do not hardcode `en-IN`, `INR`, or `toE164` default `"IN"` in `src/app/**` or `src/modules/**`; read `InstallSettings` (see `src/modules/install/`).

- [ ] **Step 8: Rewrite docs/architecture.md as current state**

Replace the frontmatter + “No Prisma yet” / Next 15 / MFA-not-implemented / ManualPaymentProvider-only claims. Keep: monolith, route groups, `transitionBookingStatus`, claim locking, module layout, semantic tokens, RLS deny-all PostgREST. Add: `InstallSettings` singleton + `/setup`; Razorpay exists but only for `country === "IN"`; staff AAL2 exists; Next 16. Do not keep the six-phase todo list as unfinished work — mark the product as shipped and describe what it is now.

- [ ] **Step 9: Delete old wave docs and unused public assets**

Delete the four wave plan files and `docs/superpowers/specs/2026-08-31-cabfleet-go-live-program-design.md`. Delete unused image directories from Step 1. Do not delete `docs/superpowers/plans/2026-09-20-cabfleet-oss-release.md`.

- [ ] **Step 10: Verify hygiene**

Run: `rg -n "TailAdmin" --glob '!docs/superpowers/plans/**' --glob '!docs/superpowers/specs/**' README.md LICENSE src/app src/modules docs/architecture.md AGENTS.md || true`

Expected: no TailAdmin in README, error pages, or AGENTS.md except a historical attribution sentence in README/LICENSE/`docs/architecture.md`.

- [ ] **Step 11: Commit**

```bash
git add README.md LICENSE package.json CONTRIBUTING.md SECURITY.md CODE_OF_CONDUCT.md AGENTS.md docs/architecture.md src/app/not-found.tsx src/app/(full-width-pages)/(error-pages)/error-404/page.tsx src/components/auth/SignInForm.tsx src/components/auth/ResetPasswordRequestForm.tsx
git add -u docs/superpowers public
git commit -m "$(cat <<'EOF'
docs: replace TailAdmin surface with CabFleet OSS hygiene

README, license, and community files now describe CabFleet so a
public clone is not mistaken for the dashboard template.
EOF
)"
```

---

### Task 2: formatMoney and formatDateTime

**Files:**
- Create: `src/lib/format/money.ts`, `src/lib/format/datetime.ts`, `src/lib/format/money.test.ts`, `src/lib/format/datetime.test.ts`

**Interfaces:**
- Produces:
  - `formatMoney(amount: number | string | { toString(): string }, opts: { locale: string; currency: string }): string`
  - `formatDateTime(value: Date | string | number, opts: { locale: string; timeZone: string; dateStyle?: "short" | "medium" | "long"; timeStyle?: "short" | "medium" }): string`
- Consumes: none

- [ ] **Step 1: Write failing tests**

`src/lib/format/money.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("formats INR in en-IN without a hardcoded rupee in the helper", () => {
    const s = formatMoney(499, { locale: "en-IN", currency: "INR" });
    expect(s).toMatch(/499/);
    expect(s).toMatch(/₹|INR/);
  });

  it("formats USD in en-US", () => {
    const s = formatMoney(499, { locale: "en-US", currency: "USD" });
    expect(s).toMatch(/499/);
    expect(s).toMatch(/\$|USD/);
  });
});
```

`src/lib/format/datetime.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatDateTime } from "./datetime";

describe("formatDateTime", () => {
  it("uses the given timeZone", () => {
    const d = new Date("2026-09-20T06:30:00.000Z");
    const kolkata = formatDateTime(d, {
      locale: "en-IN",
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
    const utc = formatDateTime(d, {
      locale: "en-US",
      timeZone: "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    });
    expect(kolkata).not.toEqual(utc);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/format/money.test.ts src/lib/format/datetime.test.ts`

Expected: FAIL (modules not found)

- [ ] **Step 3: Implement**

`src/lib/format/money.ts`:

```ts
export function formatMoney(
  amount: number | string | { toString(): string },
  opts: { locale: string; currency: string },
): string {
  const n = typeof amount === "number" ? amount : Number(amount.toString());
  return new Intl.NumberFormat(opts.locale, {
    style: "currency",
    currency: opts.currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}
```

`src/lib/format/datetime.ts`:

```ts
export function formatDateTime(
  value: Date | string | number,
  opts: {
    locale: string;
    timeZone: string;
    dateStyle?: "short" | "medium" | "long";
    timeStyle?: "short" | "medium";
  },
): string {
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(opts.locale, {
    timeZone: opts.timeZone,
    dateStyle: opts.dateStyle ?? "medium",
    timeStyle: opts.timeStyle,
  }).format(d);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/format/money.test.ts src/lib/format/datetime.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/format
git commit -m "$(cat <<'EOF'
feat: add locale-aware money and datetime formatters

Callers pass locale and currency so India is not hardcoded in display
helpers.
EOF
)"
```

---

### Task 3: country-defaults catalog

**Files:**
- Create: `src/modules/install/country-defaults.ts`, `src/modules/install/country-defaults.test.ts`, `src/modules/install/install.constants.ts`

**Interfaces:**
- Produces:
  - `export type CountryDefaults = { currency: string; locale: string; timezone: string; phoneRegion: string; taxIdLabel: string; taxRate: number }`
  - `export function defaultsForCountry(iso2: string): CountryDefaults`
  - `export const COUNTRY_OPTIONS: { value: string; label: string }[]`
  - `export type InstallSettingsView` in `install.constants.ts` (client-safe): `{ country: string; currency: string; locale: string; timezone: string; phoneRegion: string; taxIdLabel: string; taxRate: number; setupCompletedAt: string | null }`
- Consumes: none

- [ ] **Step 1: Write failing test**

```ts
import { describe, expect, it } from "vitest";
import { defaultsForCountry } from "./country-defaults";

describe("defaultsForCountry", () => {
  it("returns India GSTIN/INR/IST defaults", () => {
    expect(defaultsForCountry("IN")).toEqual({
      currency: "INR",
      locale: "en-IN",
      timezone: "Asia/Kolkata",
      phoneRegion: "IN",
      taxIdLabel: "GSTIN",
      taxRate: 0,
    });
  });

  it("is case-insensitive", () => {
    expect(defaultsForCountry("in").currency).toBe("INR");
  });

  it("falls back for unknown ISO codes", () => {
    expect(defaultsForCountry("ZZ")).toEqual({
      currency: "USD",
      locale: "en-US",
      timezone: "UTC",
      phoneRegion: "US",
      taxIdLabel: "Tax ID",
      taxRate: 0,
    });
  });

  it("has explicit rows for US, GB, AE, AU, SG, DE", () => {
    expect(defaultsForCountry("US").currency).toBe("USD");
    expect(defaultsForCountry("GB").currency).toBe("GBP");
    expect(defaultsForCountry("AE").timezone).toBe("Asia/Dubai");
    expect(defaultsForCountry("AU").currency).toBe("AUD");
    expect(defaultsForCountry("SG").currency).toBe("SGD");
    expect(defaultsForCountry("DE").taxIdLabel).toBe("VAT");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/modules/install/country-defaults.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement catalog**

Put explicit maps for `IN, US, GB, AE, AU, SG, DE` plus `FALLBACK`. `COUNTRY_OPTIONS` is a static list of ISO 3166-1 alpha-2 codes with English names covering at least: IN, US, GB, AE, AU, SG, DE, CA, NZ, ZA, FR, IE, NL, MY, PH, ID, TH, LK, BD, PK, QA, SA, JP, KR, BR, MX, NG, KE, EG, TR, PL, ES, IT, SE, NO, DK, FI, CH, AT, BE, PT, HK. Sort by label. `defaultsForCountry` uppercases the code, looks up the map, else FALLBACK.

`install.constants.ts` exports `InstallSettingsView` only (no `db` imports).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/modules/install/country-defaults.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/install/country-defaults.ts src/modules/install/country-defaults.test.ts src/modules/install/install.constants.ts
git commit -m "$(cat <<'EOF'
feat: add install country default catalog

India stays the richest preset; unknown countries fall back to USD/UTC
so setup is not hardcoded to IST.
EOF
)"
```

---

### Task 4: Require explicit phone region

**Files:**
- Modify: `src/lib/utils/phone.ts`, `src/lib/utils/phone.test.ts`
- Modify callers that currently omit region: `src/modules/notifications/providers/TwilioWhatsAppProvider.ts`, `src/modules/notifications/services/notifyOnTransition.ts`
- Leave callers that already pass `"IN"` as `"IN"` until Task 9/10 (signup/desk still India-shaped until install settings are wired).

**Interfaces:**
- Produces: `toE164(input, defaultRegion: CountryCode): ParsedPhone` — **no default argument**
- Produces: `isValidE164(input, defaultRegion: CountryCode): boolean` — **no default argument**

- [ ] **Step 1: Write failing tests (replace default-region cases)**

Change `phone.test.ts` so:

```ts
it("normalizes an Indian 10-digit number when region is IN", () => {
  const r = toE164("9876543210", "IN");
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.e164).toBe("+919876543210");
});

it("does not treat a 10-digit number as IN when region is US", () => {
  const r = toE164("9876543210", "US");
  // US national numbers are 10 digits; this particular NPA may be invalid.
  // Assert the function required a region by also covering E.164:
  const e164 = toE164("+919876543210", "US");
  expect(e164.ok).toBe(true);
  if (e164.ok) expect(e164.e164).toBe("+919876543210");
});
```

Remove tests that call `toE164("9876543210")` with one argument. Update `isValidE164` tests to pass `"IN"`.

- [ ] **Step 2: Run tests — they must fail because production still defaults to IN and TypeScript still allows one arg (or tests fail on new US case).**

Run: `npx vitest run src/lib/utils/phone.test.ts`

If the file still compiles with one-arg calls in production, also run `npx tsc --noEmit` after Step 3.

- [ ] **Step 3: Remove defaults in phone.ts**

```ts
export function toE164(
  input: string | null | undefined,
  defaultRegion: CountryCode,
): ParsedPhone {
```

Same for `isValidE164`. Update the file comment: region is required; install `phoneRegion` is passed by callers.

In `TwilioWhatsAppProvider.ts` and `notifyOnTransition.ts`, pass `"IN"` as a temporary explicit region (Task 10 switches these to `settings.phoneRegion`). Do **not** leave zero-arg calls.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run src/lib/utils/phone.test.ts && npx tsc --noEmit`

Expected: PASS / 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/phone.ts src/lib/utils/phone.test.ts src/modules/notifications
git commit -m "$(cat <<'EOF'
fix: require an explicit region for E.164 parsing

Callers must pass a country code so India is no longer the hidden
default inside phone helpers.
EOF
)"
```

---

### Task 5: MAIL_FROM and SETUP_SECRET env

**Files:**
- Modify: `src/lib/env.ts`, `.env.example`, `src/lib/email.ts`
- Create: `src/lib/email.test.ts` (mock Resend if needed — prefer extracting `mailFrom()` and testing that)

**Interfaces:**
- Produces: `env.SETUP_SECRET: string | undefined`
- Produces: `env.MAIL_FROM: string` default `"CabFleet <noreply@localhost>"`

- [ ] **Step 1: Write failing test for mail from helper**

Add `export function mailFrom(): string { return env.MAIL_FROM; }` in `email.ts` after env fields exist — first write the test against `mailFrom` once the env key exists. Simpler: unit-test a tiny `src/lib/email-from.ts`:

```ts
export function resolveMailFrom(raw: string | undefined): string {
  const v = raw?.trim();
  return v && v.length > 0 ? v : "CabFleet <noreply@localhost>";
}
```

Test:

```ts
import { describe, expect, it } from "vitest";
import { resolveMailFrom } from "./email-from";

describe("resolveMailFrom", () => {
  it("uses the env value when set", () => {
    expect(resolveMailFrom("CabFleet <ops@example.com>")).toBe(
      "CabFleet <ops@example.com>",
    );
  });
  it("falls back when empty", () => {
    expect(resolveMailFrom(undefined)).toBe("CabFleet <noreply@localhost>");
    expect(resolveMailFrom("")).toBe("CabFleet <noreply@localhost>");
  });
});
```

- [ ] **Step 2: Run test — FAIL (module missing)**

Run: `npx vitest run src/lib/email-from.test.ts`

- [ ] **Step 3: Implement helper + wire env + email.ts**

Add to `env.ts` server schema:

```ts
SETUP_SECRET: z.string().min(1).optional(),
MAIL_FROM: z.string().min(1).default("CabFleet <noreply@localhost>"),
```

Add both to `runtimeEnv`. In `email.ts` `from:` use `env.MAIL_FROM`. Document `SETUP_SECRET`, `MAIL_FROM`, and the `INSTALL_*` seed keys in `.env.example` exactly as the spec §7 (INSTALL_* are seed-only comments, not in `env.ts`).

- [ ] **Step 4: Tests pass; grep hardcoded from**

Run: `npx vitest run src/lib/email-from.test.ts` and `rg -n "noreply@cabfleet.app" src`

Expected: tests PASS; no `noreply@cabfleet.app` in `src/`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/env.ts src/lib/email.ts src/lib/email-from.ts src/lib/email-from.test.ts .env.example
git commit -m "$(cat <<'EOF'
feat: make outbound mail From address configurable

Stop shipping a hardcoded cabfleet.app mailbox so self-hosters can set
MAIL_FROM.
EOF
)"
```

---

### Task 6: InstallSettings schema, RLS, seed

**Files:**
- Modify: `prisma/schema.prisma`, `prisma/seed.ts`, `scripts/check-rls-coverage.ts`
- Create: `prisma/migrations/20260920120000_install_settings/migration.sql`, `prisma/sql/16_rls_install_settings.sql`

**Interfaces:**
- Produces Prisma model `InstallSettings` with fields from the spec (`id` default `"default"`).
- Seed: if `process.env.INSTALL_COUNTRY` is set, upsert completed settings from `INSTALL_*` env (with defaults matching spec §7). HQ `Branch.timezone` becomes `INSTALL_TIMEZONE` when seeding settings; otherwise HQ stays `UTC`.
- `check-rls-coverage.ts`: scan **every** `prisma/migrations/**/migration.sql` for each model name.

- [ ] **Step 1: Write a failing coverage expectation**

Temporarily you cannot add the model without breaking coverage. **Order:** first change `check-rls-coverage.ts` to scan all migration files; run it (should still pass on current schema). Then add the model + new migration that contains `"InstallSettings"` so coverage stays green.

Replace the single-file read with:

```ts
import { readdirSync } from "node:fs";

function readAllMigrations(): string {
  const dir = join(ROOT, "prisma", "migrations");
  const chunks: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "migration_lock.toml") continue;
    const sqlPath = join(dir, name, "migration.sql");
    try {
      chunks.push(readFileSync(sqlPath, "utf8"));
    } catch {
      /* skip */
    }
  }
  return chunks.join("\n");
}

const migration = readAllMigrations();
```

- [ ] **Step 2: Run coverage — still PASS on current schema**

Run: `npx tsx scripts/check-rls-coverage.ts`

Expected: `✔ RLS coverage`

- [ ] **Step 3: Add model + migration + SQL file + seed**

Prisma model (after `Organization` is fine; no org relation):

```prisma
model InstallSettings {
  id               String    @id @default("default")
  country          String
  currency         String
  locale           String
  timezone         String
  phoneRegion      String
  taxIdLabel       String
  taxRate          Int       @default(0)
  setupCompletedAt DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}
```

Update `Organization.gstRate` comment: allowed 0–100; 0 hides tax lines. Do not rename `gstin`.

Migration SQL:

```sql
CREATE TABLE "InstallSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "country" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "phoneRegion" TEXT NOT NULL,
  "taxIdLabel" TEXT NOT NULL,
  "taxRate" INTEGER NOT NULL DEFAULT 0,
  "setupCompletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InstallSettings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InstallSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InstallSettings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "deny_direct_api_access" ON "InstallSettings" AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON TABLE "InstallSettings" FROM anon, authenticated;
GRANT ALL ON TABLE "InstallSettings" TO postgres, service_role;
```

Mirror the RLS block in `prisma/sql/16_rls_install_settings.sql`.

Seed: HQ timezone `"UTC"` in the create path (change the current `"Asia/Kolkata"`). After org/branch/types, if `process.env.INSTALL_COUNTRY` is set, upsert `InstallSettings` id `default` with env fields and `setupCompletedAt: new Date()`, update HQ timezone to `INSTALL_TIMEZONE ?? defaults`. Use `defaultsForCountry` from `country-defaults.ts` when individual INSTALL_* keys are missing.

- [ ] **Step 4: Run coverage + prisma validate**

Run: `npx tsx scripts/check-rls-coverage.ts && npx prisma validate`

Expected: both PASS. Do not require a live DB for migrate in CI; committing the SQL folder is enough.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts prisma/migrations/20260920120000_install_settings prisma/sql/16_rls_install_settings.sql scripts/check-rls-coverage.ts
git commit -m "$(cat <<'EOF'
feat: add InstallSettings singleton with deny-all RLS

Seed can complete setup from INSTALL_* env so CI never depends on the
wizard.
EOF
)"
```

---

### Task 7: completeSetup service + action

**Files:**
- Create: `src/modules/install/validators/setup.ts`, `src/modules/install/queries/install.ts`, `src/modules/install/services/install.service.ts`, `src/modules/install/services/install.service.test.ts`, `src/modules/install/actions/setup.actions.ts`

**Interfaces:**
- Consumes: `defaultsForCountry`, `completeSetupSchema`, `writeAudit`, `db`, `env.SETUP_SECRET`, `timingSafeEqual` via `crypto`
- Produces:
  - `getInstallSettings(): Promise<InstallSettings | null>`
  - `completeSetup(input: CompleteSetupInput, actor: { id: string | null }): Promise<Result<InstallSettings>>`
  - `completeSetupAction` via `action("install.setup", completeSetupSchema, ...)`

`CompleteSetupInput` fields: `country, currency, locale, timezone, phoneRegion, taxIdLabel, taxRate, setupSecret?: string`.

Rules:
1. If `env.SETUP_SECRET` is set, compare `input.setupSecret` with constant-time `crypto.timingSafeEqual` on equal-length buffers; mismatch → `AppError("FORBIDDEN", "Invalid setup secret.")`. If lengths differ, still return FORBIDDEN (do not throw).
2. Load existing row `id = "default"`. If `setupCompletedAt` is set and `actor.id` is null → `AppError("CONFLICT", "Setup already completed.")`. Re-complete with actor allowed (ADMIN check lives in the action).
3. Transaction: upsert `InstallSettings` with `setupCompletedAt: new Date()`, `writeAudit` entity `"InstallSettings"` action `"CREATE"` on first complete else `"UPDATE"`, `byProfileId: actor.id`. If HQ branch `code === "HQ"` and `timezone === "UTC"`, set timezone to `input.timezone`. Copy `input.taxRate` onto the default org (`slug === "default"`) `gstRate` on first complete only.
4. Return `ok(row)`.
5. Action: if settings already completed, `await requireRole(["ADMIN", "SUPER_ADMIN"])` before calling the service. `revalidatePath("/")` and `revalidatePath("/setup")`.

- [ ] **Step 1: Write failing service tests** (mock `db` + `writeAudit` + `env` like `branch.service.test.ts`)

Cases:
- first upsert writes audit CREATE and updates HQ timezone when UTC
- second call with `actor.id === null` throws CONFLICT
- SETUP_SECRET set and wrong secret → FORBIDDEN
- SETUP_SECRET set and correct secret → succeeds

- [ ] **Step 2: Run tests — FAIL (module missing)**

Run: `npx vitest run src/modules/install/services/install.service.test.ts`

- [ ] **Step 3: Implement validator, query, service, action**

Zod:

```ts
export const completeSetupSchema = z.object({
  country: z.string().trim().length(2),
  currency: z.string().trim().min(3).max(3),
  locale: z.string().trim().min(2).max(16),
  timezone: z.string().trim().min(1).max(64),
  phoneRegion: z.string().trim().length(2),
  taxIdLabel: z.string().trim().min(1).max(32),
  taxRate: z.coerce.number().int().min(0).max(100),
  setupSecret: z.string().optional(),
});
export type CompleteSetupFormValues = z.input<typeof completeSetupSchema>;
export type CompleteSetupInput = z.infer<typeof completeSetupSchema>;
```

`getInstallSettings`: `db.installSettings.findUnique({ where: { id: "default" } })`.

- [ ] **Step 4: Run tests — PASS**

Run: `npx vitest run src/modules/install/services/install.service.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/modules/install
git commit -m "$(cat <<'EOF'
feat: complete install setup in one audited transaction

First complete is anonymous; later updates require an admin actor so a
public /setup cannot be replayed.
EOF
)"
```

---

### Task 8: `/setup` wizard, public path, layout gates, provider

**Files:**
- Create: `src/modules/install/components/SetupWizard.tsx`, `src/modules/install/components/InstallSettingsProvider.tsx`, `src/app/setup/page.tsx`, `src/app/setup/layout.tsx`, `e2e/setup.spec.ts`
- Modify: `src/lib/auth/public-paths.ts`, `src/lib/auth/public-paths.test.ts`, `src/middleware.ts` (add `/setup` to `AUTH_PATHS` rate-limit list), `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/(admin)/layout.tsx`, `src/app/(driver)/layout.tsx`, `src/app/(customer)/layout.tsx`, `src/app/(admin)/settings/page.tsx`

**Interfaces:**
- Consumes: `completeSetupAction`, `completeSetupSchema`, `COUNTRY_OPTIONS`, `defaultsForCountry`, `getInstallSettings`, `InstallSettingsView`
- Produces: two-step wizard; `useInstallSettings()` hook returning `InstallSettingsView | null`

- [ ] **Step 1: Failing public-path test**

Add to `public-paths.test.ts`:

```ts
it("allows /setup", () => {
  expect(isPublicPath("/setup")).toBe(true);
});
```

- [ ] **Step 2: Run test — FAIL**

Run: `npx vitest run src/lib/auth/public-paths.test.ts`

Expected: FAIL (`/setup` false)

- [ ] **Step 3: Add `/setup` to `PUBLIC_PATH_PREFIXES`. Add `/setup` to middleware `AUTH_PATHS`. Re-run test — PASS.**

- [ ] **Step 4: InstallSettingsProvider**

Client file. Context value `InstallSettingsView | null`. Hook `useInstallSettings()`.

Root `src/app/layout.tsx` stays a Server Component: `const settings = await getInstallSettings()` then map to `InstallSettingsView` (`setupCompletedAt` as ISO string or null) and wrap children:

```tsx
<InstallSettingsProvider settings={settings ? toView(settings) : null}>
```

Helper `toView` in `queries/install.ts` (server) so the client file only receives a plain object.

- [ ] **Step 5: Gates**

Add `INSTALL_GATE` to `src/lib/env.ts` as `boolFromString` default **true**. When `false`, skip setup redirects (CI Playwright has no Postgres; the current landing e2e must keep passing). Set `INSTALL_GATE: "false"` in `.github/workflows/ci.yml` job `env` alongside `SKIP_ENV_VALIDATION`. Document in `.env.example`: production leaves it unset (true); CI sets false.

If `INSTALL_GATE` is true and `!settings?.setupCompletedAt`:
- `src/app/page.tsx`: `redirect("/setup")` before session redirect
- admin/driver/customer layouts: `redirect("/setup")` after the existing session check (unauthenticated users never reach these layouts)

`src/app/setup/page.tsx`: if settings completed and no admin session, `redirect("/signin")`; if completed and ADMIN/SUPER_ADMIN, still show wizard (reconfigure). If incomplete, show wizard. `dynamic = "force-dynamic"`. Layout: no admin chrome; reuse landing spacing (`min-h-screen bg-surface`, `max-w-md`), not `AuthLayout` marketing split.

- [ ] **Step 6: SetupWizard (two steps)**

`"use client"`. `useForm<CompleteSetupFormValues>({ resolver: zodResolver(completeSetupSchema) })`. Step 1: country `SelectField` with `COUNTRY_OPTIONS`. Continue copies `defaultsForCountry(country)` into currency/locale/timezone/phoneRegion/taxIdLabel/taxRate via `reset`/`setValue`. Step 2: country read-only, other fields editable, Back, optional `setupSecret` input always shown (label: “Setup secret (if your host set SETUP_SECRET)”). Submit calls `completeSetupAction`; on `ok`, `router.push("/signin")`; map `fieldErrors` with `setError`. Semantic tokens only. `useWatch({ control, name: "country" })` — never `watch()`.

- [ ] **Step 7: Settings link**

Add a Settings card: title “Install”, description “Country, currency, timezone for this deployment.”, href `/setup`. Visible to ADMIN/SUPER_ADMIN only (filter the array by role in the page; pass role from session — page is already a server component, add `getSessionUser` and hide the card for STAFF).

- [ ] **Step 8: Optional Playwright spec**

`e2e/setup.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.skip(!process.env.E2E_FORCE_SETUP, "Set E2E_FORCE_SETUP=true against an unseeded install.");

test("setup wizard step 1 is reachable", async ({ page }) => {
  await page.goto("/setup");
  await expect(page.getByRole("heading", { name: /Where does this fleet run/i })).toBeVisible();
});
```

CI does not set `E2E_FORCE_SETUP`.

- [ ] **Step 9: Unit tests still pass**

Run: `npx vitest run src/lib/auth/public-paths.test.ts src/modules/install`

Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/app/setup src/modules/install/components src/lib/auth/public-paths.ts src/lib/auth/public-paths.test.ts src/middleware.ts src/app/page.tsx src/app/layout.tsx src/app/(admin)/layout.tsx src/app/(driver)/layout.tsx src/app/(customer)/layout.tsx src/app/(admin)/settings/page.tsx e2e/setup.spec.ts
git commit -m "$(cat <<'EOF'
feat: add two-step /setup wizard and install gates

Unauthenticated first-run configures country before any portal loads.
EOF
)"
```

---

### Task 9: Tax ID, gstRate range, Razorpay India-only

**Files:**
- Modify: `src/modules/orgs/validators/org.ts`, `src/modules/orgs/services/org.service.ts`, `src/modules/orgs/components/GstSettingsForm.tsx`, `src/app/(admin)/settings/gst/page.tsx`, `src/modules/payments/providers/index.ts`, `src/modules/payments/providers/index.test.ts`, `src/modules/payments/components/RazorpayCheckoutButton.tsx`, `src/app/(admin)/settings/page.tsx` (GST section copy), `src/lib/csp.ts` only if needed (CSP can stay env-gated; factory is the product gate)

**Interfaces:**
- Consumes: `getInstallSettings()`
- Produces: `getPaymentProvider(country: string): PaymentProvider` — if `country !== "IN"`, always Manual even when `PAYMENT_GATEWAY=RAZORPAY`. If `country === "IN"`, keep today’s env fail-closed behavior.
- `updateOrgGstSchema` becomes `makeUpdateOrgGstSchema(country: string)` OR service-side validation:
  - `gstRate` 0–100 always
  - GSTIN regex only when `country === "IN"`; else `gstin` max 32 chars, empty → null

- [ ] **Step 1: Failing payment-provider test**

```ts
it("returns Manual for non-IN even when Razorpay env is complete", () => {
  envState.PAYMENT_GATEWAY = "RAZORPAY";
  envState.RAZORPAY_KEY_ID = "rzp_test";
  envState.RAZORPAY_KEY_SECRET = "secret";
  envState.RAZORPAY_WEBHOOK_SECRET = "whsec";
  expect(getPaymentProvider("US").name).toBe("MANUAL");
});

it("returns Razorpay for IN when secrets are set", () => {
  envState.PAYMENT_GATEWAY = "RAZORPAY";
  envState.RAZORPAY_KEY_ID = "rzp_test";
  envState.RAZORPAY_KEY_SECRET = "secret";
  envState.RAZORPAY_WEBHOOK_SECRET = "whsec";
  expect(getPaymentProvider("IN").name).toBe("RAZORPAY");
});
```

Update existing tests to pass `"IN"` where they expect Razorpay.

- [ ] **Step 2: Run — FAIL (signature still zero-arg)**

Run: `npx vitest run src/modules/payments/providers/index.test.ts`

- [ ] **Step 3: Implement factory + update `payment.service.ts`, `refund.service.ts`, `reconcile-payments/route.ts` to `getPaymentProvider((await getInstallSettings())?.country ?? "IN")`.** Using `"IN"` as fallback only when settings are missing keeps CI/dev from silently enabling Razorpay for a US install that never ran setup — **after setup exists, always pass settings.country**. If settings null, return Manual (safer): `getPaymentProvider(settings?.country ?? "")` and treat non-`"IN"` as Manual.

- [ ] **Step 4: GST validator tests**

Add `src/modules/orgs/validators/org.test.ts`: IN rejects `gstin: "NOPE"`; US accepts `gstin: "12-3456789"`; both accept `gstRate: 18`; both reject `gstRate: 101`.

Implement `makeUpdateOrgGstSchema(country: string)` accordingly. `GstSettingsForm` takes `country` and `taxIdLabel` props from the GST page (`getInstallSettings()`). Page title uses `taxIdLabel` not hardcoded “GSTIN” when country is not IN. Hide Razorpay-related settings copy when country is not IN (no Razorpay card on settings if none exists today — skip if there is no Razorpay settings UI).

`RazorpayCheckoutButton`: if `useInstallSettings()?.country !== "IN"`, render nothing (desk already uses Manual).

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/modules/payments/providers/index.test.ts src/modules/orgs/validators/org.test.ts`

Expected: PASS. Then `npx tsc --noEmit`.

- [ ] **Step 6: Commit**

```bash
git add src/modules/orgs src/modules/payments src/app/(admin)/settings src/app/api/cron/reconcile-payments
git commit -m "$(cat <<'EOF'
feat: gate GSTIN and Razorpay on install country

Non-India installs get a generic tax ID and manual payments only.
EOF
)"
```

---

### Task 10: Replace hardcoded locale/currency/phone in UI and remaining callers

**Files (replace `en-IN` / `INR` / `₹` / `Asia/Kolkata` with formatters + `useInstallSettings` or RSC `getInstallSettings`):**

Every match under `src/app` and `src/modules` from `rg 'en-IN|"INR"|₹|Asia/Kolkata' src/app src/modules` except `country-defaults.ts` and tests that assert India catalog values.

Known files from the spec search: admin bookings/payments/invoices/dashboard/reports/expenses/audit/customers/shifts pages; customer portal pages; driver attendance/trips; `BookingTimeline`, `DeskQueue`, `CustomerBookingForm`, `invoice-pdf.tsx`, `ExpenseForm`, `RazorpayCheckoutButton` (currency), `profile.constants.ts` default timezone, `profile/validators/profile.ts` `LOCALE_OPTIONS` / `TIMEZONE_OPTIONS`, `BranchForm` placeholder, notification enqueue copy if it hardcodes rupees.

Also switch remaining `toE164(..., "IN")` in `customer.service.ts`, `customer-by-phone.ts`, `SignUpForm.tsx`, `auth/validators.ts` to `settings.phoneRegion` (server: `getInstallSettings()`; client signup: `useInstallSettings()?.phoneRegion ?? "US"` — if setup incomplete, signup is not the first-run path because `/` redirected to `/setup`. After setup, provider is non-null. If null, pass `"US"` fallback, never implicit IN).

Desk 10-digit copy: if `phoneRegion === "IN"` keep “10-digit mobile”; else “Phone number”.

Twilio: `TwilioWhatsAppProvider` allowed-countries: if `env.TWILIO_ALLOWED_COUNTRIES` is still the schema default, prefer install country. Do not break explicit env. Implementation: parse env; if unset/default `"IN"` **and** install country is set, use install country. Document in `.env.example` that TWILIO_ALLOWED_COUNTRIES overrides.

`profile.constants.ts`: `DEFAULT_NOTIFICATION_PREFS.timezone` cannot be Kolkata. Export `defaultNotificationPrefs(timezone: string)` or set timezone to `"UTC"` and let the profile form inject install timezone as defaultValues. Update `profile.constants.test.ts` to pass an explicit timezone (no `Asia/Kolkata` assertion unless testing the catalog).

`LOCALE_OPTIONS`: include install locale plus `en-US`, `en-GB`, `en-IN`, `hi-IN` (dedupe). `TIMEZONE_OPTIONS`: install timezone first, then UTC, Asia/Kolkata, Asia/Dubai, Europe/London, America/New_York (dedupe).

Invoice PDF: pass `locale` and `currency` into the PDF component from `generateInvoice` via `getInstallSettings()`.

- [ ] **Step 1: Add a unit test that `rg` will not replace — instead test `defaultNotificationPrefs`:**

```ts
expect(defaultNotificationPrefs("UTC").timezone).toBe("UTC");
```

Fail until the helper exists.

- [ ] **Step 2: Implement helper + sweep.** For each page that currently inlines `new Intl.NumberFormat("en-IN", { currency: "INR" })`, use `formatMoney` / `formatDateTime` with settings from `getInstallSettings()` in Server Components, or `useInstallSettings()` in client components. If settings is null in a gated layout, that is a bug (layout should have redirected); throw `new Error("Install settings missing")` only in development-unreached paths.

- [ ] **Step 3: Grep guard**

Run: `rg -n 'en-IN|"INR"|'\''INR'\''|₹|Asia/Kolkata' src/app src/modules --glob '!**/country-defaults.ts' --glob '!**/*.test.ts'`

Expected: no matches except possibly comments. Fix stragglers.

- [ ] **Step 4: Run unit tests + typecheck**

Run: `npm test && npx tsc --noEmit`

Expected: 0 failures, 0 type errors. Fix regressions in profile/booking tests that assumed Kolkata/INR.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "$(cat <<'EOF'
feat: drive money, dates, and phones from install settings

Feature UI no longer assumes en-IN or INR unless the operator chose
India at /setup.
EOF
)"
```

---

### Task 11: Full verification then git author rewrite and GitHub publish

**Files:** none of the app after verification; git history + GitHub metadata.

Do **not** mix rewrite with feature commits.

- [ ] **Step 1: Verification**

```bash
npm run lint
npm run typecheck
npm test
npm run check:tokens
npm run check:structure
SKIP_ENV_VALIDATION=true \
  DATABASE_URL="postgresql://u:p@localhost:5432/db" \
  DIRECT_URL="postgresql://u:p@localhost:5432/db" \
  NEXT_PUBLIC_SUPABASE_URL="http://x" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="x" \
  SUPABASE_SERVICE_ROLE_KEY="x" \
  AUTH_PROOF_SECRET="ci-placeholder-proof-secret-32ch" \
  npm run build
npm run test:e2e
```

Expected: lint 0 errors (existing TailAdmin sidebar warnings allowed), typecheck 0, tests pass, structure/tokens pass, build succeeds, Playwright landing + CSP pass. Live desk/trip specs skip. If anything fails, **stop** and fix on the feature branch; do not rewrite history.

- [ ] **Step 2: Resolve GitHub noreply**

Run: `gh api user --jq '"\(.id)+\(.login)@users.noreply.github.com"'`

If `gh` is missing, install GitHub CLI or BLOCKED. Use that address as `NEW_EMAIL`. `NEW_NAME="CabFleet contributors"`.

- [ ] **Step 3: Rewrite only CabFleet-era authors**

Install `git-filter-repo` if needed. Use a mailmap / `--replace-text` / `--email-callback` so **only** authors matching `shripadhharish` or `MacBook` become `CabFleet contributors <NEW_EMAIL>`. Do **not** rewrite TailAdmin authors (`mosarrof121@gmail.com`, `naim.pimjo@gmail.com`, `Coderamrin`, etc.).

Verify:

```bash
git log --format='%an <%ae>' | sort -u
```

Expected: no `shripadhharish`, no `MacBook`. TailAdmin names remain.

- [ ] **Step 4: Force-push while private**

Confirm `gh repo view Legendofallpro/taxiappv2 --json isPrivate` is `true`. Then:

```bash
git push --force-with-lease origin HEAD:main
```

If the repo is already public, **stop** and do not force-push.

- [ ] **Step 5: Rename and publish**

```bash
gh repo rename cabfleet --yes
gh repo edit --description "Staff desk, customer portal, and driver portal for cab dispatch" --homepage "" --add-topic nextjs --add-topic supabase --add-topic prisma --add-topic fleet --add-topic dispatch
gh repo edit --enable-private-vulnerability-reporting
gh repo edit --visibility public --accept-visibility-change-consequences
```

If rename fails because `cabfleet` is taken, keep `taxiappv2` and leave README title as CabFleet (spec last resort).

- [ ] **Step 6: Final author check on origin**

```bash
git log origin/main --format='%an <%ae>' | sort -u
```

Expected: same as Step 3.

---

## Self-review notes (controller)

Spec coverage: hygiene (T1), formatters (T2), catalog (T3), phone region (T4), MAIL_FROM/SETUP_SECRET (T5), schema/RLS/seed (T6), completeSetup (T7), wizard/gates (T8), GST/Razorpay (T9), UI sweep (T10), tests+rewrite+public (T11). Follow-up spec explicitly excluded.

Twilio default: T10 uses install country when env still default IN.

`PRECONDITION` error code: not added; missing settings on gated routes redirect (T8). Formatter paths throw a development Error if provider is null.
