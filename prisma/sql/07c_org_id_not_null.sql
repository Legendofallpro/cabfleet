-- Phase 7 W1 — Flip orgId to NOT NULL on every tenant-scoped table.
--
-- Apply ONLY after:
--   1. 06_profile_sync_org.sql is live (new signups get orgId from JWT/slug)
--   2. 07a + 07b have landed and soaked
--   3. scripts/backfill-org-id.ts has been run against prod and reports zero
--      remaining NULLs across every tenant table (its final SELECT pass
--      writes a summary line).
--
-- Profile is intentionally NOT in this list — SUPER_ADMIN rows must remain
-- nullable, enforced by the Profile_orgId_required_for_non_super CHECK
-- constraint added in 20260529150000_add_org_tenancy/migration.sql.
--
-- ROLLBACK
-- --------
--   ALTER TABLE "<X>" ALTER COLUMN "orgId" DROP NOT NULL;
--
-- Each statement uses the `ALTER COLUMN ... SET NOT NULL` form; if any
-- table still has NULLs the statement aborts the whole block. That's the
-- safety we want — better to fail loudly than silently lose data.

begin;

alter table public."Branch"             alter column "orgId" set not null;
alter table public."Driver"             alter column "orgId" set not null;
alter table public."Staff"              alter column "orgId" set not null;
alter table public."Customer"           alter column "orgId" set not null;
alter table public."Vehicle"            alter column "orgId" set not null;
alter table public."VehicleAssignment"  alter column "orgId" set not null;
alter table public."BookingType"        alter column "orgId" set not null;
alter table public."Booking"            alter column "orgId" set not null;
alter table public."PricingRule"        alter column "orgId" set not null;
alter table public."DispatchRule"       alter column "orgId" set not null;
alter table public."Payment"            alter column "orgId" set not null;
alter table public."Invoice"            alter column "orgId" set not null;
alter table public."Shift"              alter column "orgId" set not null;
alter table public."Attendance"         alter column "orgId" set not null;
alter table public."FuelLog"            alter column "orgId" set not null;
alter table public."Expense"            alter column "orgId" set not null;
alter table public."MaintenanceLog"     alter column "orgId" set not null;
alter table public."AssignmentHistory"  alter column "orgId" set not null;
alter table public."AuditLog"           alter column "orgId" set not null;

commit;
