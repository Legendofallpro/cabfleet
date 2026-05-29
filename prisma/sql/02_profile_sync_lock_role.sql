-- Harden profile sync: ignore client-supplied `role` in auth metadata.
--
-- Previously `handle_new_auth_user()` coalesced role from
-- `raw_user_meta_data->>'role'`, which is fully client-controllable via
-- `supabase.auth.signUp({ options: { data: { role: 'ADMIN' } } })`. That
-- allowed an attacker to mint themselves an ADMIN Profile on signup.
--
-- Self-service signup is for CUSTOMER only. Drivers/Staff are created via
-- admin invite paths, which override role inside a server transaction
-- AFTER the trigger runs (see src/modules/{drivers,staff}/services).
--
-- Apply this in the Supabase SQL editor after deploying.

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
    'CUSTOMER',
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
