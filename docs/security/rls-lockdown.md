# RLS Lockdown Runbook

Addresses Supabase security advisor finding: `rls_disabled_in_public`.

**Source of truth:** Prisma migrations, especially
[`prisma/migrations/20260914150000_rls_force_deny_postgrest/migration.sql`](../../prisma/migrations/20260914150000_rls_force_deny_postgrest/migration.sql).
`prisma migrate deploy` applies ENABLE + FORCE RLS, the restrictive
`deny_direct_api_access` policy, and `REVOKE ALL … FROM anon, authenticated`
for every domain table.

The numbered files under [`prisma/sql/`](../../prisma/sql/) are **emergency
SQL-editor copies** for incidents. Do not treat them as the deploy path.
Never apply [`07b_rls_orgid_filter_restrictive.sql`](../../prisma/sql/07b_rls_orgid_filter_restrictive.sql)
as written — it drops deny-all and would open PostgREST.

CI: `npm run check:structure` runs `scripts/check-rls-coverage.ts` so every
`model` in `schema.prisma` is listed in the deny-PostgREST migration.

---

## Why this matters

Any table in the `public` schema without Row-Level Security (RLS) is reachable via the Supabase Data API (PostgREST) by anyone who holds the project URL and anon key. This is a critical risk for all tables containing business or user data.

---

## Access model

This app never queries domain tables via PostgREST or the Supabase client SDK. All data access goes through:

| Access path | Role | RLS applies? |
|---|---|---|
| Prisma (`DATABASE_URL` / `DIRECT_URL`) | postgres superuser | No — superuser bypasses RLS |
| Supabase service-role admin client | service_role | No — Supabase bypasses RLS for service role |
| PostgREST (Supabase Data API) | anon / authenticated | **Yes** — deny all + FORCE + REVOKE |

Correct posture: every domain table should deny all PostgREST access for both `anon` and `authenticated`. Table owners are also subject to RLS (`FORCE ROW LEVEL SECURITY`); the Prisma role remains a superuser so the app is unaffected.

---

## Table inventory and policy intent

26 Prisma models. All of them: ENABLE RLS, FORCE RLS, `deny_direct_api_access` (restrictive, `USING (false)`), `REVOKE ALL FROM anon, authenticated, PUBLIC`.

| Table | Risk | Policy intent |
|---|---|---|
| `"Organization"` | High — tenant root | Deny all PostgREST |
| `"Branch"` | High — tenant config | Deny all PostgREST |
| `"Profile"` | High — user PII | Deny all PostgREST |
| `"Driver"` | High — PII + operations | Deny all PostgREST |
| `"Staff"` | High — PII + operations | Deny all PostgREST |
| `"Customer"` | High — PII + financials | Deny all PostgREST |
| `"Vehicle"` | High — fleet data | Deny all PostgREST |
| `"VehicleAssignment"` | Medium — operational | Deny all PostgREST |
| `"BookingType"` | Medium — config | Deny all PostgREST |
| `"Booking"` | High — core transactional | Deny all PostgREST |
| `"TripLocation"` | High — live GPS | Deny all PostgREST |
| `"AssignmentHistory"` | Medium — audit trail | Deny all PostgREST |
| `"PricingRule"` | Medium — financial config | Deny all PostgREST |
| `"DispatchRule"` | Medium — operational config | Deny all PostgREST |
| `"Payment"` | High — financial | Deny all PostgREST |
| `"Refund"` | High — financial | Deny all PostgREST |
| `"WebhookEvent"` | Medium — provider payloads | Deny all PostgREST |
| `"Invoice"` | High — financial | Deny all PostgREST |
| `"Attendance"` | High — HR / PII | Deny all PostgREST |
| `"Shift"` | Medium — operational | Deny all PostgREST |
| `"FuelLog"` | Low — operational | Deny all PostgREST |
| `"Expense"` | Medium — financial | Deny all PostgREST |
| `"MaintenanceLog"` | Low — operational | Deny all PostgREST |
| `"NotificationOutbox"` | High — recipient PII | Deny all PostgREST |
| `"NotificationLog"` | High — recipient PII | Deny all PostgREST |
| `"AuditLog"` | High — immutable audit | Deny all PostgREST |
| `_prisma_migrations` | Internal infra | Full deny + REVOKE (see `03_*`) |

**`auth.*` tables** (e.g. `auth.users`) are managed by Supabase and are out of scope.

---

## SQL files (emergency only)

Apply in the Supabase SQL editor only when `migrate deploy` cannot run:

1. [`prisma/sql/03_rls_hotfix_prisma_migrations.sql`](../../prisma/sql/03_rls_hotfix_prisma_migrations.sql) — `_prisma_migrations`
2. Re-run the deny-PostgREST migration SQL (or the matching blocks in `04` / `08`–`11`)

Both styles are **idempotent**.

---

## Verification

After deploy, run this audit query in the Supabase SQL editor (same query the security advisor uses):

```sql
select
  t.tablename,
  c.relrowsecurity        as rls_enabled,
  c.relforcerowsecurity   as rls_forced,
  (select count(*) from pg_policies p where p.tablename = t.tablename) as policy_count
from pg_tables t
join pg_class c on c.relname = t.tablename
where t.schemaname = 'public'
order by rls_enabled, t.tablename;
```

**Expected:** every domain table shows `rls_enabled = true`, `rls_forced = true`, and `policy_count >= 1`. `_prisma_migrations` shows `rls_forced = true`.

Also check the Supabase Dashboard → **Advisors → Security** tab. The `rls_disabled_in_public` finding should no longer appear.

---

## Rollback

If a regression is detected after applying, use this template for each affected table:

```sql
-- Substitute <Table> with the actual table name (quoted for PascalCase)
alter table public."<Table>" disable row level security;
drop policy if exists "deny_direct_api_access" on public."<Table>";
grant select, insert, update, delete on table public."<Table>" to authenticated;
```

For `_prisma_migrations`:

```sql
alter table public._prisma_migrations disable row level security;
grant select, insert, update, delete on table public._prisma_migrations to authenticated;
```

Monitor **Supabase Dashboard → Logs → PostgREST** for `401`/`403` errors after each rollout wave.

---

## Adding new tables in future

> See `AGENTS.md` Section 12 for the enforced rule.

Every new Prisma model must be added to
`prisma/migrations/YYYYMMDDHHMMSS_rls_force_deny_postgrest` (or a follow-up
migration that ENABLE + FORCE + deny-all + REVOKE). `scripts/check-rls-coverage.ts`
fails CI if the model name is missing from that file.
