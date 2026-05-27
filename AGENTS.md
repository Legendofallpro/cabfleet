# AGENTS.md — CabFleet

Conventions for AI-assisted edits in this repo. **Read this in full before making non-trivial changes.** The full architecture and phased plan live at [docs/architecture.md](docs/architecture.md).

## 1. Architecture in one paragraph

Next.js 15 App Router monolith. Supabase Auth + Postgres. Prisma 7 (with `@prisma/adapter-pg`) is the only writer. Four role groups under `src/app`: `(admin)`, `(driver)`, `(customer)`, `(full-width-pages)` for auth. Domain logic lives in `src/modules/<feature>/`. **Server Components + Server Actions are the default.** Route handlers only for webhooks and the future mobile/external REST surface.

## 2. Module shape

Every feature follows this layout — copy it for new modules:

```
src/modules/<feature>/
  actions/         Server actions. Thin: requireRole -> validate -> service -> Result.
  services/        Pure business logic. Owns transactions. Returns Result<T>.
  queries/         Read-only DB calls. Safe to call from RSC.
  validators/      zod schemas. One per action.
  components/      Module-specific UI (forms, dialogs, tables).
  hooks/           Client hooks (filters, optimistic UI).
  types.ts         Pure types (optional; prefer importing from @prisma/client).
  permissions.ts   Per-module permission constants (optional).
```

**Hard rules:**

- Actions never contain business logic.
- Services never touch `req/res`, `cookies()`, or `next/headers`.
- Cross-module access goes through the other module's `services/` or `queries/`. Never reach directly into another module's Prisma tables.
- Every mutation writes an `AuditLog` row **inside the same `db.$transaction`**.

## 3. Mutation pattern (canonical)

Every mutation looks like this. Don't deviate.

```ts
// src/modules/<feature>/services/<feature>.service.ts
export async function createX(input: XInput, actor: { id: string }): Promise<Result<X>> {
  // 1. Pre-flight validation (FK existence, dupes) -> throw AppError
  // 2. Open transaction
  const x = await db.$transaction(async (tx) => {
    const created = await tx.x.create({ data: input });
    await writeAudit(tx, { entity: "X", entityId: created.id, action: "CREATE", byProfileId: actor.id, diff: { after: created } });
    return created;
  });
  return ok(x);
}
```

```ts
// src/modules/<feature>/actions/<feature>.actions.ts
"use server";
export const createXAction = action(
  "x.create",
  createXSchema,
  async (input) => {
    const actor = await requirePermission(PERMISSIONS.X_MANAGE);
    const result = await createX(input, { id: actor.profile.id });
    revalidatePath("/x");
    return result;
  },
);
```

Reference implementations:
- Branch (simplest): [src/modules/branches/services/branch.service.ts](src/modules/branches/services/branch.service.ts)
- Driver (calls Supabase admin too): [src/modules/drivers/services/driver.service.ts](src/modules/drivers/services/driver.service.ts)

## 4. Conventions

| Area | Rule |
|---|---|
| Result type | Services return `Result<T>` from `src/lib/result.ts`. Throw `AppError` for unexpected failures. |
| Auth | Every server action's first line is `await requireRole([...])` or `await requirePermission(...)`. |
| Validation | Every action wraps with `action(name, schema, fn)` from `src/lib/actions.ts`. Don't bypass it. |
| DB | Import `db` from `src/lib/db.ts`. Never `new PrismaClient()`. |
| Env | Never read `process.env` directly in app code. Always go through `src/lib/env.ts`. (`prisma.config.ts` and `prisma/seed.ts` are the only exceptions.) |
| Logging | Use `logger` from `src/lib/logger.ts`. Log every mutation outcome and every dispatch decision. |
| Naming | `PascalCase` types and React components. `camelCase` for everything else. `kebab-case` for folders and non-component files. |

## 5. Forms

- **Use `react-hook-form` + `zodResolver`** with the same zod schema as the server action.
- Type the form with **`z.input<typeof schema>`** (not `z.infer`). Dates arrive from `<input type="date">` as strings; `z.coerce.date()` converts at parse time. Inferring the *output* type leaks `Date` into RHF defaultValues and breaks typing.
- Canonical example: [src/modules/drivers/validators/driver.ts](src/modules/drivers/validators/driver.ts) + [src/modules/drivers/components/DriverInviteForm.tsx](src/modules/drivers/components/DriverInviteForm.tsx).
- Use `<TextField>`, `<SelectField>` from `src/components/common/form/` for new fields. They're RHF-compatible (forward refs, accept `{...register("x")}`).
- Translate server-side `fieldErrors` from `Result.error.fieldErrors` back to RHF with `setError(field, { message })`.

## 6. Booking lifecycle (Phase 2 starts here)

**Build `src/modules/bookings/services/transitionBookingStatus.ts` FIRST.** Every status change — staff assignment, driver claim, customer cancel, anything — goes through this one function. Never `db.booking.update({ status })` from anywhere else.

The status enum and schema are already in [prisma/schema.prisma](prisma/schema.prisma) (`BookingStatus`, `Booking`, `AssignmentHistory`). The full state machine diagram is in [docs/architecture.md](docs/architecture.md) section 2.3. The transition function:

1. Loads the current booking with `version`.
2. Validates the proposed transition against an allow-list per current status.
3. Opens a transaction.
4. Updates booking with `where: { id, version }` (optimistic lock), increments `version`.
5. Writes `AssignmentHistory` if driver/vehicle changed.
6. Writes `AuditLog`.
7. Returns `Result<Booking>`.

## 7. Driver claim concurrency (Phase 4)

Use `SELECT FOR UPDATE SKIP LOCKED` inside `db.$transaction` against `OPEN_FOR_CLAIM` bookings. The `Booking.version` column is the optimistic-lock backstop. Both are required. Load-test before shipping.

## 8. Page dynamics

Every route group layout that hits the DB must export `dynamic = "force-dynamic"`. See `src/app/(admin)/layout.tsx` for the pattern. Otherwise Next 15 will try to prerender pages and fail because the DB is unreachable at build time.

## 9. Adding a new mutation — the 5-step checklist

1. Add the zod schema in `validators/`. Export both `XFormValues = z.input<typeof schema>` and `XInput = z.infer<typeof schema>`.
2. Add the service function in `services/` returning `Result<T>`.
3. Inside the service's transaction, call `writeAudit(tx, ...)`.
4. Add the server action in `actions/`: `requirePermission` → `action(name, schema, fn)` → call service → `revalidatePath(...)` → return.
5. Wire to the UI with `react-hook-form`, the action, and a `<FormActions>` footer.

## 10. Running locally

```bash
cp .env.example .env.local       # fill in real Supabase + DB values
npx prisma generate
npx prisma migrate dev --name init
# Paste prisma/sql/01_profile_sync.sql into the Supabase SQL editor.
npx prisma db seed               # default branch + booking types + pricing rule
npm run dev
```

After signup at `/signup`, promote yourself to ADMIN via the Supabase SQL editor:

```sql
update public."Profile" set role = 'ADMIN' where email = 'you@example.com';
```

**Supabase + Prisma 7 gotchas you will hit otherwise:**

- `prisma migrate dev` cannot use the Transaction-mode pooler (port 6543). Set `DIRECT_URL` to the Session-mode pooler (port 5432). `prisma.config.ts` prefers `DIRECT_URL` when set.
- Prisma CLI does not auto-load `.env.local`. `prisma.config.ts` is wired to load it explicitly.
- Database passwords with `@ # ? / : % & + =` MUST be URL-encoded in connection strings. Easier: reset the password to plain alphanumerics.

## 11. CI baseline

These must stay green:

```bash
npm run lint        # 0 errors. 2 known warnings on TailAdmin sidebar/theme patterns.
npm run typecheck   # 0 errors.
SKIP_ENV_VALIDATION=true \
  DATABASE_URL="postgresql://u:p@localhost:5432/db" \
  NEXT_PUBLIC_SUPABASE_URL="http://x" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="x" \
  SUPABASE_SERVICE_ROLE_KEY="x" \
  npm run build
```

The GitHub Actions workflow at [.github/workflows/ci.yml](.github/workflows/ci.yml) runs all of these on every PR.

## 12. What NOT to do

These are real foot-guns this codebase has paid for. Don't undo them:

- **Don't introduce shadcn/ui.** TailAdmin's existing primitives in `src/components/ui/`, `src/components/form/`, and `src/components/common/` cover everything. Adding shadcn means a globals.css conflict and a design-system fork.
- **Don't switch server actions to route handlers** unless it's specifically for a mobile or external API.
- **Don't add Zustand, Redux, or React Context** for filter/pagination state. Use `nuqs` — already wired in `src/app/layout.tsx`.
- **Don't add Calendar, ApexCharts, FullCalendar, jvectormap, react-dnd, swiper, react-dropzone** UI for the MVP. They're still in `package.json` from the TailAdmin baseline but should be removed once their last reference is gone.
- **Don't bump Prisma, Next.js, React, or TailwindCSS versions** mid-phase.
- **Don't `db.booking.update({ status: ... })` outside `transitionBookingStatus`.** This is the single most important rule for Phase 2+.
- **Don't omit `deletedAt: null` from queries** on soft-deleted entities (`Branch`, `Vehicle`, `Driver`, `Staff`, `Customer`, `Booking`, `PricingRule`, `DispatchRule`).
- **Don't bypass `requireRole` / `requirePermission`** at the start of server actions. Every action, every time.
- **Don't `npm install` without `--legacy-peer-deps`.** `nuqs` has a stale `@remix-run/react` peer dep that blocks resolution otherwise.
- **Don't read `process.env.DATABASE_URL` from app code.** Go through `src/lib/env.ts`. (Exceptions: `prisma.config.ts`, `prisma/seed.ts`.)
- **Don't tRPC, GraphQL, microservices, Kubernetes, or message queues.** Out of scope for MVP.
- **Don't put pure UI constants (status labels, tone maps) in server-only modules.** If a constant is needed in a `"use client"` component, put it in a `*.constants.ts` file with no server imports (no `db`, no `@/lib/auth/*`, no `next/headers`). See `src/modules/bookings/booking.constants.ts` as the canonical example. Importing from a server module into a client component drags `pg`/Prisma into the browser bundle and breaks the build.
- **Don't use duplicate keys in Prisma `where` objects.** If you need two `OR` conditions, wrap them: `AND: [{ OR: [...] }, { OR: [...] }]`. Duplicate keys silently drop the first condition at runtime — TypeScript will now catch this as a compile error.
- **Don't use `watch()` from `useForm()` in components.** Use `useWatch({ control, name })` instead — it subscribes only to the named field and is React Compiler-friendly.
- **Don't export `parsePageParams` from a `"use client"` file** and call it from an RSC. Server-safe utilities must live in plain `.ts` files (e.g., `src/lib/utils/page-params.ts`) so Next 15 can call them during server render.

## 13. UI & theming — **read before writing any JSX**

Full reference: [docs/ui-styling.md](docs/ui-styling.md)

### AI styling directive

> **Never** use arbitrary Tailwind values (e.g. `w-[100px]`, `text-[13px]`, `rounded-[17px]`) or raw palette colors (e.g. `bg-brand-500`, `text-gray-700`, `bg-blue-500/10`, `dark:bg-success-500/15`) in `src/app/**` or `src/modules/**`. Use only semantic tokens and shared components from `src/components/common/**` and `src/components/ui/**`. Status UI **must** use `<StatusBadge tone={...}>` with a `StatusTone` union — never local `STATUS_COLOR` maps.

### Styling layer model (summary)

| Layer | Path | Palette allowed? |
|-------|------|-----------------|
| Theme | `src/app/globals.css` | Yes — defines all tokens |
| UI primitives | `src/components/ui/*` | Yes — only long-term palette-aware layer |
| Common components | `src/components/common/*` | **No** — semantic tokens only |
| Feature code | `src/app/*`, `src/modules/*/components/*` | **Forbidden** |

### Quick migration cheat sheet

| Legacy (do not use in feature code) | Semantic replacement |
|-------------------------------------|----------------------|
| `bg-brand-50`, `bg-brand-500/10` | `bg-primary-subtle` |
| `text-brand-500`, `text-brand-700` | `text-primary` or `text-on-primary-subtle` |
| `bg-brand-500` | `bg-primary` |
| `hover:bg-brand-600` | `hover:bg-primary-hover` |
| `bg-white dark:bg-white/[0.03]` | `bg-surface-elevated` |
| `bg-gray-50` (page bg) | `bg-surface` |
| `border-gray-200 dark:border-gray-800` | `border-default` |
| `text-gray-800 dark:text-white/90` | `text-default` |
| `text-gray-500 dark:text-gray-400` | `text-muted` |
| `bg-success-50 dark:bg-success-500/15` | `bg-success-subtle` |
| `bg-error-50 dark:bg-error-500/15` | `bg-error-subtle` |
| `text-success-700 dark:text-success-400` | `text-on-success-subtle` |
| `text-[13px]`, `text-theme-sm` | `text-caption` |
| `rounded-[17px]` | `rounded-lg` |

### Status badge rule

```ts
// Allowed — status → tone → StatusBadge
import { StatusBadge, type StatusTone } from "@/components/common/StatusBadge";

const ATTENDANCE_TONE: Record<string, StatusTone> = {
  PRESENT: "success",
  HALF_DAY: "warning",
  ABSENT: "error",
  ON_LEAVE: "info",
};

<StatusBadge tone={ATTENDANCE_TONE[status] ?? "neutral"}>{label}</StatusBadge>
```

```ts
// Forbidden — never do this
const STATUS_COLOR = { PRESENT: "bg-success-100 text-success-700" };
<span className={STATUS_COLOR[status]}>Present</span>
```

### What NOT to do (UI additions)

- **Don't write `bg-brand-*`, `text-gray-*`, `border-gray-*`** in `src/app/**` or `src/modules/**`.
- **Don't use opacity palette hacks** (`bg-brand-500/10`, `dark:bg-success-500/15`). Use `bg-primary-subtle` etc.
- **Don't use arbitrary Tailwind values** (`w-[372px]`, `text-[13px]`) in feature code.
- **Don't create local `STATUS_COLOR` maps** — use `<StatusBadge>`.
- **Don't copy-paste stat card or filter bar markup** into new pages — use `StatCard` / `DateRangeFilterBar` from `src/components/common/`.
- **Don't expose `className` on common components for color overrides** — it breaks the token boundary.

## 14. Where things live (quick reference)

| Concern | File / dir |
|---|---|
| Architecture plan | [docs/architecture.md](docs/architecture.md) |
| Prisma schema | [prisma/schema.prisma](prisma/schema.prisma) |
| Auth trigger SQL | [prisma/sql/01_profile_sync.sql](prisma/sql/01_profile_sync.sql) |
| Seed | [prisma/seed.ts](prisma/seed.ts) |
| Prisma client | [src/lib/db.ts](src/lib/db.ts) |
| Env validation | [src/lib/env.ts](src/lib/env.ts) |
| Supabase clients | [src/lib/supabase/](src/lib/supabase/) |
| RBAC | [src/lib/auth/](src/lib/auth/) |
| Server-action wrapper | [src/lib/actions.ts](src/lib/actions.ts) |
| Audit helper | [src/lib/audit.ts](src/lib/audit.ts) |
| Result / AppError | [src/lib/result.ts](src/lib/result.ts) + [src/lib/errors.ts](src/lib/errors.ts) |
| Logger | [src/lib/logger.ts](src/lib/logger.ts) |
| Middleware | [src/middleware.ts](src/middleware.ts) |
| Shared DataTable | [src/components/common/DataTable.tsx](src/components/common/DataTable.tsx) + [DataTableToolbar.tsx](src/components/common/DataTableToolbar.tsx) |
| Shared form fields | [src/components/common/form/](src/components/common/form/) |
| Status badge | [src/components/common/StatusBadge.tsx](src/components/common/StatusBadge.tsx) |
| Booking status labels + helpers (client-safe) | [src/modules/bookings/booking.constants.ts](src/modules/bookings/booking.constants.ts) |
| Admin shell | [src/app/(admin)/layout.tsx](src/app/(admin)/layout.tsx) + [_components/AdminShell.tsx](src/app/(admin)/_components/AdminShell.tsx) |
| Sidebar nav config | [src/layout/AppSidebar.tsx](src/layout/AppSidebar.tsx) |
| UI styling guide | [docs/ui-styling.md](docs/ui-styling.md) |
| `cn()` class helper | [src/lib/cn.ts](src/lib/cn.ts) |
