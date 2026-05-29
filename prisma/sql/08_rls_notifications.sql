-- RLS lockdown: Phase 7 W2 notification tables (Organization, NotificationOutbox, NotificationLog)
--
-- Same posture as 04_rls_lockdown_all_tables.sql — every domain table is
-- locked down from anon + authenticated; Prisma (postgres superuser) and the
-- Supabase service-role admin client bypass RLS by design.
--
-- New tables added by:
--   - prisma/migrations/20260529150000_add_org_tenancy/  (Organization)
--   - prisma/migrations/20260529160000_add_notifications/ (NotificationOutbox, NotificationLog)
--
-- Idempotent — safe to re-run.

-- =========================================================
-- Organization (added in W1)
-- =========================================================
alter table public."Organization" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Organization'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."Organization"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- NotificationOutbox (added in W2)
-- =========================================================
alter table public."NotificationOutbox" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'NotificationOutbox'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."NotificationOutbox"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;

-- =========================================================
-- NotificationLog (added in W2)
-- =========================================================
alter table public."NotificationLog" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'NotificationLog'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."NotificationLog"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;
