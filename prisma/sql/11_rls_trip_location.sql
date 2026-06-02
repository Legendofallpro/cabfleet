-- RLS lockdown: Phase 7 W5 TripLocation table.
--
-- Required by AGENTS.md §12. Deny direct PostgREST access; Prisma
-- (superuser role) bypasses by design.
--
-- The W5 customer LiveTripMap does NOT read TripLocation rows via
-- PostgREST — it subscribes to a Supabase Broadcast channel that the
-- ingest service publishes to. That keeps RLS strict and avoids
-- relaxing it for the customer's anon session. If a future feature
-- needs direct reads, scope a new permissive policy by booking
-- ownership rather than dropping this one.
--
-- Idempotent.

alter table public."TripLocation" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'TripLocation'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."TripLocation"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;
