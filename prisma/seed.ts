/**
 * Idempotent seed for local development and CI.
 *
 * Run with: `npx prisma db seed`
 *
 * Creates the minimum data Phase 2+ needs:
 *   - One default Branch (HQ)
 *   - The canonical BookingTypes (Local, Outstation, Rental, Airport)
 *   - A default PricingRule per BookingType
 *   - A default DispatchRule (MANUAL globally)
 *
 * Does NOT create profiles, drivers, vehicles, or customers — those come from
 * the Supabase signup flow and the admin invite UI.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { DispatchMode, PrismaClient } from "@prisma/client";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL must be set in .env.local or .env to run the seed.");
}

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding default Organization...");
  const org = await db.organization.upsert({
    where: { slug: "default" },
    update: { name: "Default Organization" },
    create: {
      slug: "default",
      name: "Default Organization",
    },
  });
  console.log(`  -> Organization ${org.slug} (${org.id})`);

  console.log("Seeding default Branch...");
  const branch = await db.branch.upsert({
    where: { code: "HQ" },
    update: { orgId: org.id },
    create: {
      code: "HQ",
      name: "Headquarters",
      timezone: "Asia/Kolkata",
      defaultDispatch: DispatchMode.MANUAL,
      active: true,
      orgId: org.id,
    },
  });
  console.log(`  -> Branch ${branch.code} (${branch.id})`);

  console.log("Seeding BookingTypes...");
  const bookingTypes = [
    { name: "Local", description: "Within-city point-to-point", defaultDispatchMode: DispatchMode.MANUAL },
    { name: "Outstation", description: "Inter-city, one-way or round trip", defaultDispatchMode: DispatchMode.MANUAL },
    { name: "Rental", description: "Hourly / daily rental package", defaultDispatchMode: DispatchMode.MANUAL },
    { name: "Airport", description: "Pickup or drop at the airport", defaultDispatchMode: DispatchMode.CLAIM },
  ] as const;

  for (const bt of bookingTypes) {
    const created = await db.bookingType.upsert({
      where: { name: bt.name },
      update: {
        description: bt.description,
        defaultDispatchMode: bt.defaultDispatchMode,
        orgId: org.id,
      },
      create: { ...bt, active: true, orgId: org.id },
    });
    console.log(`  -> BookingType ${created.name} (${created.id})`);

    const existingPricing = await db.pricingRule.findFirst({
      where: { bookingTypeId: created.id, branchId: branch.id, deletedAt: null },
    });
    if (!existingPricing) {
      await db.pricingRule.create({
        data: {
          bookingTypeId: created.id,
          branchId: branch.id,
          baseFare: 50,
          perKm: 14,
          perMin: 1,
          orgId: org.id,
        },
      });
      console.log(`     pricing rule created`);
    }
  }

  console.log("Seeding default DispatchRule (global MANUAL fallback)...");
  const existingDefaultDispatch = await db.dispatchRule.findFirst({
    where: {
      branchId: null,
      bookingTypeId: null,
      customerSegment: null,
      deletedAt: null,
    },
  });
  if (!existingDefaultDispatch) {
    await db.dispatchRule.create({
      data: {
        priority: 1000,
        mode: DispatchMode.MANUAL,
        active: true,
        orgId: org.id,
      },
    });
    console.log("  -> Created");
  } else {
    console.log("  -> Already exists");
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
