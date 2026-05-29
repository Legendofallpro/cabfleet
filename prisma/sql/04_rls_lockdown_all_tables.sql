-- RLS lockdown: all public-schema domain tables
--
-- CONTEXT
-- -------
-- This app never queries domain tables via PostgREST / the Supabase client SDK.
-- All data access goes through one of two paths:
--   1. Prisma (DATABASE_URL / DIRECT_URL) — direct Postgres connection,
--      runs as postgres superuser, RLS does not apply.
--   2. Supabase service-role admin client (SUPABASE_SERVICE_ROLE_KEY) —
--      Supabase explicitly bypasses RLS for the service role.
--
-- Therefore the correct posture for every domain table is:
--   anon          → no access
--   authenticated → no access via PostgREST
--
-- ACCESS MATRIX (role × operation)
-- ---------------------------------
-- Table                 | anon | authenticated | service_role | prisma
-- ----------------------+------+---------------+--------------+-------
-- All domain tables     | DENY | DENY          | full (bypass)| full (bypass)
-- _prisma_migrations    | DENY | DENY (03_*)   | full (bypass)| full (bypass)
--
-- APPLY ORDER
-- -----------
-- 1. prisma/sql/03_rls_hotfix_prisma_migrations.sql   (hotfix, apply first)
-- 2. prisma/sql/04_rls_lockdown_all_tables.sql        (this file)
--
-- Both files are idempotent and safe to re-run.
--
-- ROLLBACK TEMPLATE (per table, if a regression is detected)
-- -----------------------------------------------------------
--   alter table public."<Table>" disable row level security;
--   drop policy if exists "deny_direct_api_access" on public."<Table>";
--   grant select, insert, update, delete on table public."<Table>" to authenticated;
--
-- AUDIT QUERY (run in Supabase SQL editor to verify after applying)
-- -----------------------------------------------------------------
--   select t.tablename,
--          c.relrowsecurity      as rls_enabled,
--          c.relforcerowsecurity as rls_forced,
--          (select count(*) from pg_policies p where p.tablename = t.tablename) as policy_count
--   from pg_tables t
--   join pg_class c on c.relname = t.tablename
--   where t.schemaname = 'public'
--   order by rls_enabled, t.tablename;
-- All rows should show rls_enabled = true and policy_count >= 1.

-- =========================================================
-- Helper: idempotent policy creation macro
-- (PostgreSQL has no CREATE POLICY IF NOT EXISTS, so we
--  drop-and-recreate inside a DO block per table.)
-- =========================================================

-- =========================================================
-- Branch
-- =========================================================
alter table public."Branch" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Branch'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."Branch"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- Profile
-- =========================================================
alter table public."Profile" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Profile'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."Profile"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- Driver
-- =========================================================
alter table public."Driver" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Driver'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."Driver"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- Staff
-- =========================================================
alter table public."Staff" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Staff'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."Staff"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- Customer
-- =========================================================
alter table public."Customer" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Customer'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."Customer"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- Vehicle
-- =========================================================
alter table public."Vehicle" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Vehicle'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."Vehicle"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- VehicleAssignment
-- =========================================================
alter table public."VehicleAssignment" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'VehicleAssignment'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."VehicleAssignment"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- BookingType
-- =========================================================
alter table public."BookingType" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'BookingType'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."BookingType"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- Booking
-- =========================================================
alter table public."Booking" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Booking'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."Booking"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- AssignmentHistory
-- =========================================================
alter table public."AssignmentHistory" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'AssignmentHistory'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."AssignmentHistory"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- PricingRule
-- =========================================================
alter table public."PricingRule" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'PricingRule'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."PricingRule"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- DispatchRule
-- =========================================================
alter table public."DispatchRule" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'DispatchRule'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."DispatchRule"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- Payment
-- =========================================================
alter table public."Payment" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Payment'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."Payment"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- Invoice
-- =========================================================
alter table public."Invoice" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Invoice'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."Invoice"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- Attendance
-- =========================================================
alter table public."Attendance" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Attendance'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."Attendance"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- Shift
-- =========================================================
alter table public."Shift" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Shift'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."Shift"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- FuelLog
-- =========================================================
alter table public."FuelLog" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'FuelLog'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."FuelLog"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- Expense
-- =========================================================
alter table public."Expense" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Expense'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."Expense"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- MaintenanceLog
-- =========================================================
alter table public."MaintenanceLog" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'MaintenanceLog'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."MaintenanceLog"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- AuditLog
-- =========================================================
alter table public."AuditLog" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'AuditLog'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."AuditLog"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;
