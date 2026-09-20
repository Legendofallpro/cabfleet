-- RLS lockdown: InstallSettings singleton table
--
-- Same posture as 04_rls_lockdown_all_tables.sql: deny direct PostgREST access
-- to anon + authenticated. Prisma (postgres superuser) and the Supabase
-- service-role admin client bypass RLS by design.
--
-- Required by AGENTS.md §12 (every new Prisma model must enable RLS).
-- Idempotent — safe to re-run.

-- =========================================================
-- InstallSettings (OSS release)
-- =========================================================
ALTER TABLE public."InstallSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."InstallSettings" FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'InstallSettings'
      AND policyname = 'deny_direct_api_access'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "deny_direct_api_access" ON public."InstallSettings"
        AS RESTRICTIVE FOR ALL TO anon, authenticated
        USING (false) WITH CHECK (false)
    $p$;
  END IF;
END $$;

REVOKE ALL ON TABLE public."InstallSettings" FROM anon, authenticated;
GRANT ALL ON TABLE public."InstallSettings" TO postgres, service_role;
