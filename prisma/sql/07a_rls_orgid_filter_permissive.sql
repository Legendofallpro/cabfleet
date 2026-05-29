-- Phase 7 W1 — Tenant-scoped RLS (PERMISSIVE phase) — apply first
--
-- BACKGROUND
-- ----------
-- 04_rls_lockdown_all_tables.sql is in place and denies all PostgREST access
-- (anon + authenticated) to every domain table via a `restrictive` policy.
-- That's correct for today's app (everything goes through Prisma / the
-- service-role admin client; both bypass RLS).
--
-- This file LAYERS additional permissive policies that filter by
-- `orgId = (auth.jwt() ->> 'org_id')`. They have no effect on PostgREST
-- access yet — the deny_direct_api_access policy still wins — but they
-- prove the org-id JWT claim is propagating correctly. The next file
-- (07b) flips deny_direct_api_access to restrictive-AND-orgId-filtered;
-- 07c flips orgId NOT NULL.
--
-- WHY TWO PHASES
-- --------------
-- A bad RLS policy locks the app out of its own data. Splitting the
-- rollout lets us:
--   1. Verify the JWT claim is present in non-prod before changing
--      production behaviour.
--   2. Roll back from 07a -> 07b with no data risk (just drop policies).
--   3. Soak the policies under real traffic for >=48h before 07b.
--
-- APPLY ORDER (production)
-- ------------------------
--   1. 06_profile_sync_org.sql        — JWT claim hook + org-aware sync
--   2. 07a (this file)                — permissive policies (no behaviour change)
--   3. [SOAK 48h, monitor logs for "org_id missing" warnings]
--   4. 07b                            — flip deny_direct_api_access to
--                                       org-id-aware restrictive policy
--   5. backfill discipline cycle complete on prod
--   6. 07c                            — flip orgId columns to NOT NULL
--
-- Idempotent. Safe to re-run.

-- Tenant-scoped tables. Profile is intentionally excluded (SUPER_ADMIN may
-- carry orgId IS NULL and the existing CHECK constraint enforces the rule).
-- Match the TENANT_SCOPED_MODELS set in src/lib/org-context.ts.
do $$
declare
  t text;
  pol_name text := 'orgid_jwt_filter';
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
    -- RLS is already enabled by 04_rls_lockdown_all_tables.sql; calling
    -- enable a second time is a no-op.
    execute format('alter table public.%I enable row level security', t);

    -- Drop+recreate so changes to the policy expression apply on re-run.
    execute format('drop policy if exists %I on public.%I', pol_name, t);
    execute format(
      'create policy %I on public.%I '
      'as permissive for all to authenticated '
      'using ("orgId" = (auth.jwt() ->> %L)) '
      'with check ("orgId" = (auth.jwt() ->> %L))',
      pol_name, t, 'org_id', 'org_id'
    );
  end loop;
end $$;
