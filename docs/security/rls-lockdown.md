# RLS Lockdown Runbook

Addresses Supabase security advisor finding: `rls_disabled_in_public`.

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
| PostgREST (Supabase Data API) | anon / authenticated | **Yes** |

Correct posture: every domain table should deny all PostgREST access for both `anon` and `authenticated`.

---

## Table inventory and policy intent

| Table | Risk | RLS | FORCE RLS | Policy intent |
|---|---|---|---|---|
| `_prisma_migrations` | Internal infra | ✅ | ✅ | Full deny + REVOKE grants |
| `"Branch"` | High — tenant config | ✅ | — | Deny all PostgREST |
| `"Profile"` | High — user PII | ✅ | — | Deny all PostgREST |
| `"Driver"` | High — PII + operations | ✅ | — | Deny all PostgREST |
| `"Staff"` | High — PII + operations | ✅ | — | Deny all PostgREST |
| `"Customer"` | High — PII + financials | ✅ | — | Deny all PostgREST |
| `"Vehicle"` | High — fleet data | ✅ | — | Deny all PostgREST |
| `"VehicleAssignment"` | Medium — operational | ✅ | — | Deny all PostgREST |
| `"BookingType"` | Medium — config | ✅ | — | Deny all PostgREST |
| `"Booking"` | High — core transactional | ✅ | — | Deny all PostgREST |
| `"AssignmentHistory"` | Medium — audit trail | ✅ | — | Deny all PostgREST |
| `"PricingRule"` | Medium — financial config | ✅ | — | Deny all PostgREST |
| `"DispatchRule"` | Medium — operational config | ✅ | — | Deny all PostgREST |
| `"Payment"` | High — financial | ✅ | — | Deny all PostgREST |
| `"Invoice"` | High — financial | ✅ | — | Deny all PostgREST |
| `"Attendance"` | High — HR / PII | ✅ | — | Deny all PostgREST |
| `"Shift"` | Medium — operational | ✅ | — | Deny all PostgREST |
| `"FuelLog"` | Low — operational | ✅ | — | Deny all PostgREST |
| `"Expense"` | Medium — financial | ✅ | — | Deny all PostgREST |
| `"MaintenanceLog"` | Low — operational | ✅ | — | Deny all PostgREST |
| `"AuditLog"` | High — immutable audit | ✅ | — | Deny all PostgREST |

**`auth.*` tables** (e.g. `auth.users`) are managed by Supabase and are out of scope.

---

## SQL files to apply

Apply in order in the Supabase SQL editor:

1. [`prisma/sql/03_rls_hotfix_prisma_migrations.sql`](../../prisma/sql/03_rls_hotfix_prisma_migrations.sql) — immediate hotfix for `_prisma_migrations`
2. [`prisma/sql/04_rls_lockdown_all_tables.sql`](../../prisma/sql/04_rls_lockdown_all_tables.sql) — RLS + deny policies for all 20 domain tables

Both files are **idempotent** and safe to re-run.

---

## Verification

After applying, run this audit query in the Supabase SQL editor:

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

**Expected:** every row shows `rls_enabled = true`. Domain tables show `policy_count >= 1`. `_prisma_migrations` shows `rls_forced = true`.

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

Every new Prisma model must be accompanied by a corresponding SQL block in `prisma/sql/04_rls_lockdown_all_tables.sql` (or a new numbered file) that enables RLS and adds the `deny_direct_api_access` restrictive policy before the migration is applied to production.
