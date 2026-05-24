# AGENTS.md — CabFleet

Conventions for AI-assisted edits in this repo. Read before making non-trivial changes.

## Architecture in one paragraph

Next.js 15 App Router monolith. Supabase Auth + Postgres. Prisma ORM is the only writer. Four role groups (`(admin)`, `(driver)`, `(customer)`, `(auth)`) under `src/app`. Domain logic lives in `src/modules/<feature>/`. Server Components + Server Actions are the default; route handlers only for webhooks/mobile REST.

## Module shape

Every feature follows this layout:

```
src/modules/<feature>/
  actions/      Server actions. Thin: requireRole -> validate -> service -> result.
  services/     Pure business logic. Owns transactions. Returns Result<T>.
  queries/      Read-only DB calls. Safe to call from RSC.
  validators/   zod schemas. One per action.
  components/   Module-specific UI.
  hooks/        Client hooks (filters, optimistic UI).
  types.ts      Pure types.
  permissions.ts  Per-module permission constants (optional).
```

Rules:

- Actions never contain business logic.
- Services never touch `req/res`, `cookies`, or `next/headers`.
- Cross-module access goes through services, never direct Prisma into another module's tables.
- Every mutation writes an `AuditLog` row inside the same transaction.

## Conventions

- **Result type**: services return `Result<T>` (`src/lib/result.ts`). Throw `AppError` for unexpected failures.
- **Auth**: every server action's first line is `await requireRole([...])` or `await requirePermission(...)` from `src/lib/auth/requireRole.ts`.
- **Validation**: every action's second line is `schema.parse(input)` (zod).
- **DB**: import `db` from `src/lib/db.ts`. Never `new PrismaClient()`.
- **Env**: never read `process.env` directly. Always go through `src/lib/env.ts`.
- **Logging**: structured `logger` from `src/lib/logger.ts`. Log every mutation and dispatch decision.
- **Naming**: `PascalCase` types and React components; `camelCase` everything else; `kebab-case` folders and non-component files.

## Booking lifecycle

Status transitions go through a single function (Phase 2): `src/modules/bookings/services/transitionBookingStatus.ts`. Never `db.booking.update({ status })` from anywhere else.

## Driver claim concurrency

Use `SELECT FOR UPDATE SKIP LOCKED` inside `db.$transaction`. The `Booking.version` column is the optimistic-lock backstop. Both are required.

## Adding a new mutation

1. Add zod schema in `validators/`.
2. Add service function in `services/` returning `Result<T>`.
3. Service must write an `AuditLog` row.
4. Add server action in `actions/` that calls `requireRole`, `schema.parse`, and the service.
5. Wire to the UI with `react-hook-form` + the action.

## Running locally

```bash
cp .env.example .env.local            # fill in Supabase + DB
npx prisma generate
npx prisma migrate dev                # creates the schema in your Supabase DB
# Then run the SQL in prisma/sql/01_profile_sync.sql in the Supabase SQL editor
npm run dev
```

## What NOT to add

- shadcn/ui: not initialized yet. Use the existing TailAdmin components in `src/components/ui/` and `src/components/form/`.
- tRPC, GraphQL, Zustand, Redux: not needed for MVP.
- Microservices, Kubernetes, message queues: out of scope.
