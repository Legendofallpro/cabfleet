-- RLS lockdown: Phase 7 W3 WebhookEvent table
--
-- Same posture as 04_rls_lockdown_all_tables.sql and 08_rls_notifications.sql:
-- deny direct PostgREST access to anon + authenticated. Prisma (postgres
-- superuser) and the Supabase service-role admin client bypass RLS by design.
--
-- Required by AGENTS.md §12 (every new Prisma model must enable RLS).
-- Idempotent — safe to re-run.

-- =========================================================
-- WebhookEvent (added in W3)
-- =========================================================
alter table public."WebhookEvent" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'WebhookEvent'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."WebhookEvent"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;
