-- RLS hotfix: lock down public._prisma_migrations
--
-- This table is a Prisma internal tracking table and must never be accessible
-- via the Supabase Data API (PostgREST). Supabase's security advisor flags any
-- table in the public schema without RLS as a critical risk.
--
-- Apply this in the Supabase SQL editor immediately (before 04_rls_lockdown_all_tables.sql).
-- Prisma CLI uses a direct Postgres connection (DATABASE_URL / DIRECT_URL) that
-- runs as the postgres superuser, so migrations are unaffected by this change.
--
-- Rollback (if needed):
--   alter table public._prisma_migrations disable row level security;
--   grant select, insert, update, delete on table public._prisma_migrations to authenticated;

alter table public._prisma_migrations enable row level security;

-- Force RLS so even the table owner cannot bypass it via the API surface.
-- (Postgres superusers still bypass this, which is correct for the Prisma CLI path.)
alter table public._prisma_migrations force row level security;

-- Strip any pre-existing grants from client roles as defence-in-depth.
revoke all on table public._prisma_migrations from anon, authenticated;
