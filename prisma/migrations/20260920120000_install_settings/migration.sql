CREATE TABLE "InstallSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "country" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "locale" TEXT NOT NULL,
  "timezone" TEXT NOT NULL,
  "phoneRegion" TEXT NOT NULL,
  "taxIdLabel" TEXT NOT NULL,
  "taxRate" INTEGER NOT NULL DEFAULT 0,
  "setupCompletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InstallSettings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InstallSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InstallSettings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "deny_direct_api_access" ON "InstallSettings" AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
REVOKE ALL ON TABLE "InstallSettings" FROM anon, authenticated;
GRANT ALL ON TABLE "InstallSettings" TO postgres, service_role;
