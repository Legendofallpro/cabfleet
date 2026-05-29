/**
 * Production rollout script (Phase 7 W1 §1.4 / S23).
 *
 * The 20260529150000_add_org_tenancy migration already backfills `orgId`
 * for every existing tenant-scoped row to the default Organization. This
 * script is the **idempotent verifier + corrective re-run** used during
 * production rollout to:
 *
 *   1. Confirm every tenant table has zero NULLs in `orgId`.
 *   2. If any NULLs exist, assign them to the default org and report.
 *   3. Print a per-table summary suitable for pasting into the rollout
 *      runbook.
 *
 * Multi-tenant deployments that have ALREADY split rows across multiple
 * orgs MUST NOT use this script — it would coalesce every uncategorised
 * row into the default org. The plan's S23 calls this out:
 *
 *   > "Backfill discipline: existing rows belong to org_default; new orgs
 *   >  are created by SUPER_ADMIN and their first signup creates the
 *   >  first tenant ADMIN."
 *
 * Usage:
 *   npx tsx scripts/backfill-org-id.ts            # report only
 *   npx tsx scripts/backfill-org-id.ts --apply    # fix NULLs
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const TENANT_TABLES = [
  "Branch",
  "Profile",
  "Driver",
  "Staff",
  "Customer",
  "Vehicle",
  "VehicleAssignment",
  "BookingType",
  "Booking",
  "PricingRule",
  "DispatchRule",
  "Payment",
  "Invoice",
  "Shift",
  "Attendance",
  "FuelLog",
  "Expense",
  "MaintenanceLog",
  "AssignmentHistory",
  "AuditLog",
] as const;

const APPLY = process.argv.includes("--apply");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });

  try {
    const defaultOrg = await db.organization.findFirst({
      where: { slug: "default", deletedAt: null },
      select: { id: true },
    });
    if (!defaultOrg) {
      console.error(
        "Default organization not found. Run `npx prisma db seed` first.",
      );
      process.exit(1);
    }
    console.log(`Default org id: ${defaultOrg.id}`);
    console.log(APPLY ? "Mode: APPLY (will UPDATE)" : "Mode: REPORT (no writes)");
    console.log("─".repeat(60));

    let totalNulls = 0;
    let totalFixed = 0;

    for (const table of TENANT_TABLES) {
      // raw SQL keeps this honest — we want to bypass the Prisma extension
      // and Profile's CHECK constraint quirks while still being type-safe
      // about parameter binding.
      const [{ count }] = await db.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*)::bigint AS count FROM "${table}" WHERE "orgId" IS NULL`,
      );
      const nulls = Number(count);
      totalNulls += nulls;

      if (nulls === 0) {
        console.log(`✔ ${table.padEnd(22)} clean`);
        continue;
      }

      if (!APPLY) {
        console.log(`✗ ${table.padEnd(22)} ${nulls} NULL(s) — re-run with --apply to fix`);
        continue;
      }

      // Profile has the CHECK constraint allowing NULL for SUPER_ADMIN only.
      // Skip SUPER_ADMIN rows here — they're intentional.
      const updated =
        table === "Profile"
          ? await db.$executeRawUnsafe(
              `UPDATE "Profile" SET "orgId" = $1 WHERE "orgId" IS NULL AND role <> 'SUPER_ADMIN'`,
              defaultOrg.id,
            )
          : await db.$executeRawUnsafe(
              `UPDATE "${table}" SET "orgId" = $1 WHERE "orgId" IS NULL`,
              defaultOrg.id,
            );

      totalFixed += updated;
      console.log(`↻ ${table.padEnd(22)} ${updated}/${nulls} backfilled`);
    }

    console.log("─".repeat(60));
    console.log(`Total NULLs found:    ${totalNulls}`);
    if (APPLY) console.log(`Total rows backfilled: ${totalFixed}`);
    if (!APPLY && totalNulls > 0) {
      console.log("\nRe-run with --apply to write the fixes.");
      process.exit(2);
    }
    if (APPLY && totalNulls > totalFixed) {
      // Profile SUPER_ADMIN rows account for the gap; surface so the runbook
      // notes it.
      console.log(
        `\nNOTE: ${totalNulls - totalFixed} rows skipped (SUPER_ADMIN profiles are intentionally orgId IS NULL).`,
      );
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
