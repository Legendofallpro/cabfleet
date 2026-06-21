-- Phase 7 W1 — Profile-sync trigger with org_id awareness + Supabase JWT claim
--
-- WHAT
-- ----
-- 1. Updates `public.handle_new_auth_user()` (originally defined in 01_profile_sync.sql)
--    so the inserted `Profile.orgId` is derived from one of two sources:
--      a. `auth.users.raw_user_meta_data->>'org_slug'` — set by invite/signup
--         flows that already know which tenant the user belongs to (driver
--         invites, customer self-signup on a tenant subdomain).
--      b. fallback: the `Organization` with slug = 'default'. Single-tenant
--         deployments keep working without code changes.
--    SUPER_ADMIN signups (role override in raw_user_meta_data) are exempt —
--    they may have orgId IS NULL (the CHECK constraint in
--    20260529150000_add_org_tenancy/migration.sql permits this).
--
-- 2. Defines a Supabase *custom access token* hook that injects `org_id`
--    and `profile_role` into every JWT. App code (and W4's `requireApiAuth`)
--    can read these claims without an extra DB roundtrip per request.
--    Registered in the Supabase dashboard under
--      Authentication → Hooks → "Custom Access Token (JWT)"
--    pointing at `public.handle_jwt_custom_claims`.
--
-- APPLY
-- -----
-- Run this in the Supabase SQL editor AFTER `20260529150000_add_org_tenancy`
-- has been applied (so the Organization table + Profile.orgId exist).
-- The function bodies are idempotent (CREATE OR REPLACE).
--
-- ROLLBACK
-- --------
-- To revert to the 01_profile_sync.sql behaviour, re-run 01_profile_sync.sql.
-- The trigger names are stable across both files.

-- ---------------------------------------------------------------------------
-- 1. Org-aware profile-sync trigger
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  resolved_org_id text;
  resolved_role public."Role";
  meta_slug text;
begin
  meta_slug := new.raw_user_meta_data->>'org_slug';

  -- Resolve org by slug (preferred), then fall back to default. Soft-deleted
  -- orgs are skipped — invites to a tombstoned org should fail loudly later.
  if meta_slug is not null then
    select id into resolved_org_id
      from public."Organization"
     where slug = meta_slug
       and "deletedAt" is null;
  end if;
  if resolved_org_id is null then
    select id into resolved_org_id
      from public."Organization"
     where slug = 'default'
       and "deletedAt" is null;
  end if;

  -- Self-service signup must be CUSTOMER (02_profile_sync_lock_role.sql).
  -- Driver/Staff invites override role in the service-layer upsert afterward.
  resolved_role := 'CUSTOMER'::public."Role";

  -- SUPER_ADMIN profiles may carry orgId IS NULL (CHECK constraint allows it).
  -- For every other role we require an org; if neither path resolved we let
  -- the CHECK constraint reject the insert so the failure surfaces clearly.
  insert into public."Profile" (
    id, email, "fullName", phone, role, "orgId", "createdAt", "updatedAt"
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.phone, new.raw_user_meta_data->>'phone'),
    resolved_role,
    case when resolved_role = 'SUPER_ADMIN' then null else resolved_org_id end,
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    "updatedAt" = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- 2. Custom Access Token (JWT) hook — injects org_id + profile_role
-- ---------------------------------------------------------------------------
-- Register in Supabase dashboard:
--   Authentication → Hooks → "Custom Access Token (JWT)"
--   Function name: public.handle_jwt_custom_claims
--
-- The hook receives `{ user_id, claims }` and returns the augmented claims
-- map. Per Supabase docs, undocumented claims roll into the JWT verbatim.
create or replace function public.handle_jwt_custom_claims(event jsonb)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  user_id uuid;
  claims jsonb;
  profile_row record;
begin
  user_id := (event->>'user_id')::uuid;
  claims  := event->'claims';

  select "orgId", role into profile_row
    from public."Profile"
   where id = user_id;

  if profile_row is not null then
    claims := claims || jsonb_build_object(
      'org_id',       profile_row."orgId",
      'profile_role', profile_row.role
    );
  end if;

  return jsonb_build_object('claims', claims);
end;
$$;

-- Supabase invokes this function as the dedicated `supabase_auth_admin` role.
-- Grant it execute permission explicitly so the hook can call the function.
grant execute on function public.handle_jwt_custom_claims to supabase_auth_admin;
