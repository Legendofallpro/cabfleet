-- DO NOT RE-APPLY THIS FILE IN PRODUCTION.
-- It trusts client-controlled `raw_user_meta_data.role` and can mint ADMIN
-- at signup. Live projects must keep 06 + 13 (role locked to CUSTOMER,
-- org always `default`). Re-running this file reopens privilege escalation.
--
-- Sync Supabase auth.users -> public.Profile (1:1).
-- Runs on insert and update of auth.users so app data tracks identity.
-- Apply this in the Supabase SQL editor AFTER the first `prisma migrate deploy`
-- has created the public."Profile" table.
--
-- SECURITY NOTE: `raw_user_meta_data->>'role'` is fully client-controllable
-- at signup. Trusting it here permits privilege escalation. The trigger
-- below is the original (kept for history); apply 02_profile_sync_lock_role.sql
-- AFTER this one to hardcode `role = 'CUSTOMER'`. Driver/Staff invites
-- override the role via an upsert inside their service transactions.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public."Profile" (id, email, "fullName", phone, role, "createdAt", "updatedAt")
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.phone, new.raw_user_meta_data->>'phone'),
    coalesce(
      (new.raw_user_meta_data->>'role')::public."Role",
      'CUSTOMER'
    ),
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

-- Mirror email/phone changes (optional but cheap)
create or replace function public.handle_auth_user_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public."Profile"
     set email = new.email,
         phone = coalesce(new.phone, phone),
         "updatedAt" = now()
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, phone on auth.users
  for each row execute function public.handle_auth_user_update();
