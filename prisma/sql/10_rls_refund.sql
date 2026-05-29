-- RLS lockdown: Phase 7 W3 Refund table.
--
-- Required by AGENTS.md §12 (every new Prisma model must enable RLS).
-- Deny direct PostgREST access; Prisma (superuser) bypasses by design.
-- Idempotent.

alter table public."Refund" enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'Refund'
      and policyname = 'deny_direct_api_access'
  ) then
    execute $p$
      create policy "deny_direct_api_access" on public."Refund"
        as restrictive for all to anon, authenticated
        using (false) with check (false)
    $p$;
  end if;
end $$;
