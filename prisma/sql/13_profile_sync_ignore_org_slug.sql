-- Ignore client-supplied org_slug on self-service signup.
-- Invites already upsert Profile under runWithOrg after the trigger fires.
--
-- APPLY in the Supabase SQL editor after 06_profile_sync_org.sql.
-- Also REVOKE PUBLIC execute on the JWT claims hook.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  resolved_org_id text;
  resolved_role public."Role";
begin
  select id into resolved_org_id
    from public."Organization"
   where slug = 'default'
     and "deletedAt" is null;

  resolved_role := 'CUSTOMER'::public."Role";

  insert into public."Profile" (
    id, email, "fullName", phone, role, "orgId", "createdAt", "updatedAt"
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.phone, new.raw_user_meta_data->>'phone'),
    resolved_role,
    resolved_org_id,
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    "updatedAt" = now();

  return new;
end;
$$;

revoke all on function public.handle_jwt_custom_claims(jsonb) from public;
revoke all on function public.handle_jwt_custom_claims(jsonb) from anon, authenticated;
grant execute on function public.handle_jwt_custom_claims(jsonb) to supabase_auth_admin;
