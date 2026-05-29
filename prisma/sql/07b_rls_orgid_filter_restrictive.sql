-- Phase 7 W1 — Tenant-scoped RLS (RESTRICTIVE phase) — apply after 07a soak
--
-- This file replaces the `deny_direct_api_access` restrictive policy from
-- 04_rls_lockdown_all_tables.sql with an `orgid_required` restrictive
-- policy that requires `orgId = auth.jwt()->>'org_id'` for any read/write.
--
-- After this lands, PostgREST access (via the Supabase JS client SDK)
-- becomes possible for tenant-scoped tables — but only for the caller's
-- own org. App code still goes through Prisma (which bypasses RLS), so
-- nothing observable changes for the existing surface.
--
-- This is the file where a bad policy can lock the app out of its own
-- data. Apply ONLY after:
--   1. 06_profile_sync_org.sql is live
--   2. 07a_rls_orgid_filter_permissive.sql has soaked >=48h
--   3. Every tenant-scoped row carries orgId IS NOT NULL (verified via
--      `select count(*) from "Booking" where "orgId" is null` etc.)
--
-- ROLLBACK
-- --------
--   Re-run prisma/sql/04_rls_lockdown_all_tables.sql.
--   It re-creates `deny_direct_api_access` and drops anything later.
--
-- Idempotent. Safe to re-run.

do $$
declare
  t text;
  tenant_tables text[] := array[
    'Branch',
    'Driver',
    'Staff',
    'Customer',
    'Vehicle',
    'VehicleAssignment',
    'BookingType',
    'Booking',
    'PricingRule',
    'DispatchRule',
    'Payment',
    'Invoice',
    'Shift',
    'Attendance',
    'FuelLog',
    'Expense',
    'MaintenanceLog',
    'AssignmentHistory',
    'AuditLog'
  ];
begin
  foreach t in array tenant_tables
  loop
    -- Drop the broad deny policy (it would always win over the org-aware
    -- restrictive policy and effectively keep PostgREST locked out).
    execute format('drop policy if exists %I on public.%I', 'deny_direct_api_access', t);
    -- Drop the 07a permissive companion — it becomes redundant once the
    -- restrictive policy below is in place.
    execute format('drop policy if exists %I on public.%I', 'orgid_jwt_filter', t);

    -- New restrictive policy: every row touched MUST belong to the JWT's org.
    execute format('drop policy if exists %I on public.%I', 'orgid_required', t);
    execute format(
      'create policy %I on public.%I '
      'as restrictive for all to anon, authenticated '
      'using ("orgId" is not null and "orgId" = (auth.jwt() ->> %L)) '
      'with check ("orgId" is not null and "orgId" = (auth.jwt() ->> %L))',
      'orgid_required', t, 'org_id', 'org_id'
    );
  end loop;
end $$;

-- Profile is the special case — SUPER_ADMIN profiles legitimately carry
-- orgId IS NULL. Block anon entirely; allow authenticated only when the
-- JWT's org_id matches OR the profile's own row matches by id (so users
-- can see their own profile irrespective of org).
alter table public."Profile" enable row level security;
drop policy if exists "deny_direct_api_access" on public."Profile";
drop policy if exists "profile_self_or_org" on public."Profile";
create policy "profile_self_or_org" on public."Profile"
  as restrictive for all to anon, authenticated
  using (
    id = auth.uid()
    or (
      "orgId" is not null
      and "orgId" = (auth.jwt() ->> 'org_id')
    )
  )
  with check (
    id = auth.uid()
    or (
      "orgId" is not null
      and "orgId" = (auth.jwt() ->> 'org_id')
    )
  );
