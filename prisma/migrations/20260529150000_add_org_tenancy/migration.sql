-- =============================================================================
-- Phase 7 W1 — Multi-org tenancy foundation
-- =============================================================================
-- This migration adds an `Organization` model, an `orgId` column on every
-- tenant-scoped table, a `SUPER_ADMIN` role, and backfills existing rows to a
-- default Organization so the system continues to function for single-tenant
-- deployments.
--
-- `orgId` is added as NULLABLE everywhere. The NOT NULL flip is deferred to a
-- later migration (prisma/sql/07c_org_id_not_null.sql) per the plan, after the
-- §7.3 S24 two-phase RLS rollout completes its staging soak. This keeps the
-- rollback path trivial (drop column / drop policy).
--
-- Also adds Booking pickup/drop lat/lng (Decimal 9,6) — these are used by W5
-- but ship in W1 to avoid a second ALTER on the Booking table.
--
-- CHECK constraint: Profile.orgId may only be NULL when role = 'SUPER_ADMIN'.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. SUPER_ADMIN role
-- ---------------------------------------------------------------------------
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN' BEFORE 'ADMIN';

-- ---------------------------------------------------------------------------
-- 2. Organization table
-- ---------------------------------------------------------------------------
CREATE TABLE "Organization" (
    "id"        TEXT NOT NULL,
    "slug"      TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_deletedAt_idx" ON "Organization"("deletedAt");

-- ---------------------------------------------------------------------------
-- 3. Default organization row (backfill target for existing data)
-- ---------------------------------------------------------------------------
-- A stable id is used so subsequent migrations and seeds can reference it.
-- Application code MUST NOT hard-code this id; resolve by slug = 'default'.
INSERT INTO "Organization" ("id", "slug", "name", "updatedAt")
VALUES ('org_default_000000000001', 'default', 'Default Organization', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Add nullable orgId to every tenant-scoped table + backfill + FK + index
-- ---------------------------------------------------------------------------
-- The default Organization id is read fresh from the table inside this block
-- so the migration is robust to the ON CONFLICT above being a no-op (re-run).

DO $$
DECLARE
    default_org_id TEXT;
    t TEXT;
    tenant_tables TEXT[] := ARRAY[
        'Branch',
        'Profile',
        'Driver',
        'Staff',
        'Customer',
        'Vehicle',
        'VehicleAssignment',
        'BookingType',
        'Booking',
        'PricingRule',
        'DispatchRule',
        'Payment',
        'Invoice',
        'Shift',
        'Attendance',
        'FuelLog',
        'Expense',
        'MaintenanceLog',
        'AssignmentHistory',
        'AuditLog'
    ];
BEGIN
    SELECT "id" INTO default_org_id
    FROM "Organization"
    WHERE "slug" = 'default';

    IF default_org_id IS NULL THEN
        RAISE EXCEPTION 'Default organization row missing — aborting backfill';
    END IF;

    FOREACH t IN ARRAY tenant_tables
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "orgId" TEXT', t);
        EXECUTE format('UPDATE %I SET "orgId" = %L WHERE "orgId" IS NULL', t, default_org_id);
        EXECUTE format(
            'ALTER TABLE %I
               ADD CONSTRAINT %I FOREIGN KEY ("orgId")
               REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE',
            t,
            t || '_orgId_fkey'
        );
        EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I("orgId")', t || '_orgId_idx', t);
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Profile.orgId — only SUPER_ADMIN may have NULL orgId
-- ---------------------------------------------------------------------------
-- Cast to text to side-step the "new enum value used in same transaction"
-- restriction Postgres still enforces for CHECK constraints. Equivalent at the
-- runtime layer because Prisma's generated query types still validate the enum.
ALTER TABLE "Profile"
    ADD CONSTRAINT "Profile_orgId_required_for_non_super"
    CHECK ("role"::text = 'SUPER_ADMIN' OR "orgId" IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 6. Booking — pickup/drop coordinates (W5 usage, shipped in W1 migration)
-- ---------------------------------------------------------------------------
ALTER TABLE "Booking"
    ADD COLUMN IF NOT EXISTS "pickupLat" DECIMAL(9, 6),
    ADD COLUMN IF NOT EXISTS "pickupLng" DECIMAL(9, 6),
    ADD COLUMN IF NOT EXISTS "dropLat"   DECIMAL(9, 6),
    ADD COLUMN IF NOT EXISTS "dropLng"   DECIMAL(9, 6);
