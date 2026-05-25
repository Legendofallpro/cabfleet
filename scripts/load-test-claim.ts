/**
 * Concurrency load test for the driver claim transaction.
 *
 * Verifies that SELECT FOR UPDATE SKIP LOCKED + Booking.version optimistic lock
 * guarantees exactly ONE successful claim when N drivers race simultaneously.
 *
 * Prerequisites:
 *   - A real Postgres database reachable via DATABASE_URL in .env.local
 *   - At least one Branch, one BookingType, one Customer, and (CONCURRENCY) Driver
 *     records (they will be looked up or mocked with a single driver re-used)
 *
 * Usage:
 *   npx tsx scripts/load-test-claim.ts
 *
 * The script is intentionally self-contained: it seeds the minimal data it
 * needs, runs the test, asserts the result, then cleans up.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, BookingStatus, DispatchMode, DriverStatus, DriverVerificationStatus } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { randomUUID } from "crypto";

loadEnv({ path: ".env.local" });
loadEnv();

const CONCURRENCY = 50; // number of simultaneous claim attempts
const TX_MAX_WAIT_MS = Number(process.env.LOAD_TEST_TX_MAX_WAIT_MS ?? "10000");
const TX_TIMEOUT_MS = Number(process.env.LOAD_TEST_TX_TIMEOUT_MS ?? "15000");

// ──────────────────────────────────────────────────────────────────────────────
// Inline claimBooking logic (mirrors the real service but uses the test db client)
// ──────────────────────────────────────────────────────────────────────────────

type RawRow = { id: string; status: string; version: number };

async function claimBookingTest(
  db: PrismaClient,
  bookingId: string,
  driverId: string,
  byProfileId: string,
  attemptId: number,
): Promise<{ ok: true } | { ok: false; code: string }> {
  try {
    await db.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<RawRow[]>`
          SELECT id, status, version
          FROM "Booking"
          WHERE id = ${bookingId}
            AND status = 'OPEN_FOR_CLAIM'
            AND "deletedAt" IS NULL
          FOR UPDATE SKIP LOCKED
        `;

        if (rows.length === 0) {
          throw Object.assign(new Error("ALREADY_CLAIMED"), { code: "ALREADY_CLAIMED" });
        }

        const locked = rows[0];
        await tx.booking.update({
          where: { id: bookingId, version: locked.version },
          data: {
            status: BookingStatus.CLAIMED,
            claimedByDriverId: driverId,
            claimedAt: new Date(),
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        await tx.assignmentHistory.create({
          data: {
            bookingId,
            driverId,
            action: "CLAIM",
            byProfileId,
            reason: "[load-test] concurrent claim",
            at: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            entity: "Booking",
            entityId: bookingId,
            action: "CLAIM",
            byProfileId,
            diff: { test: true },
          },
        });
      },
      { maxWait: TX_MAX_WAIT_MS, timeout: TX_TIMEOUT_MS },
    );
    return { ok: true };
  } catch (e: unknown) {
    const code = (e as { code?: string }).code;
    return { ok: false, code: code ?? "UNKNOWN" };
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Seed helpers
// ──────────────────────────────────────────────────────────────────────────────

async function seedTestData(db: PrismaClient) {
  console.log("  Seeding test branch...");
  const branch = await db.branch.upsert({
    where: { code: "LOADTEST" },
    update: {},
    create: {
      code: "LOADTEST",
      name: "Load Test Branch",
      timezone: "UTC",
      defaultDispatch: DispatchMode.CLAIM,
      active: true,
    },
  });

  console.log("  Seeding test booking type...");
  const bookingType = await db.bookingType.upsert({
    where: { name: "LoadTestType" },
    update: {},
    create: {
      name: "LoadTestType",
      defaultDispatchMode: DispatchMode.CLAIM,
      active: true,
    },
  });

  // Create one test customer profile + customer record
  console.log("  Seeding test customer profile...");
  const customerProfileId = randomUUID();
  const customerProfile = await db.profile.upsert({
    where: { email: "loadtest-customer@test.local" },
    update: {},
    create: {
      id: customerProfileId,
      email: "loadtest-customer@test.local",
      role: "CUSTOMER",
      branchId: branch.id,
    },
  });
  const customer = await db.customer.upsert({
    where: { profileId: customerProfile.id },
    update: {},
    create: { profileId: customerProfile.id },
  });

  // Create one test driver profile + driver record (re-used across all concurrent claimers)
  // In production each driver would have their own record; here we use one to keep seed simple.
  console.log("  Seeding test driver profile...");
  const driverProfileId = randomUUID();
  const driverProfile = await db.profile.upsert({
    where: { email: "loadtest-driver@test.local" },
    update: {},
    create: {
      id: driverProfileId,
      email: "loadtest-driver@test.local",
      role: "DRIVER",
      branchId: branch.id,
    },
  });
  const driver = await db.driver.upsert({
    where: { profileId: driverProfile.id },
    update: {},
    create: {
      profileId: driverProfile.id,
      licenseNumber: "LOADTEST-LIC-001",
      licenseExpiry: new Date("2030-01-01"),
      status: DriverStatus.ACTIVE,
      verification: DriverVerificationStatus.VERIFIED,
    },
  });

  // Create a fresh OPEN_FOR_CLAIM booking for each test run
  console.log("  Creating test booking (OPEN_FOR_CLAIM)...");
  const booking = await db.booking.create({
    data: {
      branchId: branch.id,
      customerId: customer.id,
      bookingTypeId: bookingType.id,
      status: BookingStatus.OPEN_FOR_CLAIM,
      dispatchMode: DispatchMode.CLAIM,
      pickupAt: new Date(Date.now() + 3600_000),
      pickupAddress: "Load Test Pickup",
      dropAddress: "Load Test Drop",
      passengers: 1,
      version: 0,
    },
  });

  return { booking, driver, driverProfile };
}

async function cleanupTestData(db: PrismaClient, bookingId: string) {
  console.log("  Cleaning up test data...");
  // Hard-delete the test booking and its history (keeping profiles for re-use on re-runs)
  await db.assignmentHistory.deleteMany({ where: { bookingId } });
  await db.auditLog.deleteMany({ where: { entityId: bookingId } });
  await db.booking.delete({ where: { id: bookingId } }).catch(() => null);
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set in .env.local to run the load test.");
  }

  const adapter = new PrismaPg({ connectionString });
  const db = new PrismaClient({ adapter });

  try {
    console.log(`\n🔧 Seeding test data...`);
    const { booking, driver, driverProfile } = await seedTestData(db);
    console.log(`   booking=${booking.id}  driver=${driver.id}\n`);

    console.log(`🚀 Firing ${CONCURRENCY} concurrent claim attempts...`);
    const start = Date.now();

    const results = await Promise.all(
      Array.from({ length: CONCURRENCY }, (_, i) =>
        claimBookingTest(db, booking.id, driver.id, driverProfile.id, i + 1),
      ),
    );

    const elapsed = Date.now() - start;

    const successes = results.filter((r) => r.ok);
    const alreadyClaimed = results.filter(
      (r) => !r.ok && (r as { ok: false; code: string }).code === "ALREADY_CLAIMED",
    );
    const errors = results.filter(
      (r) => !r.ok && (r as { ok: false; code: string }).code !== "ALREADY_CLAIMED",
    );

    console.log(`\n📊 Results (${elapsed}ms total):`);
    console.log(`   ✅ Successful claims : ${successes.length}`);
    console.log(`   ⛔ Already claimed   : ${alreadyClaimed.length}`);
    console.log(`   ❌ Other errors      : ${errors.length}`);
    if (errors.length > 0) {
      console.log("   Error codes:", errors.map((e) => (e as { code: string }).code));
    }

    // Verify DB state
    const finalBooking = await db.booking.findUnique({
      where: { id: booking.id },
      select: { status: true, claimedByDriverId: true, version: true },
    });
    console.log(`\n🗄  Final DB state:`);
    console.log(`   status          : ${finalBooking?.status}`);
    console.log(`   claimedByDriver : ${finalBooking?.claimedByDriverId}`);
    console.log(`   version         : ${finalBooking?.version}`);

    // ── Assertions ──────────────────────────────────────────────────────────
    let passed = true;

    if (successes.length !== 1) {
      console.error(`\n❌ FAIL: expected exactly 1 success, got ${successes.length}`);
      passed = false;
    }
    if (alreadyClaimed.length !== CONCURRENCY - 1) {
      console.error(
        `❌ FAIL: expected ${CONCURRENCY - 1} ALREADY_CLAIMED, got ${alreadyClaimed.length}`,
      );
      passed = false;
    }
    if (errors.length !== 0) {
      console.error(`❌ FAIL: unexpected errors encountered`);
      passed = false;
    }
    if (finalBooking?.status !== BookingStatus.CLAIMED) {
      console.error(`❌ FAIL: booking final status is ${finalBooking?.status}, expected CLAIMED`);
      passed = false;
    }
    if (finalBooking?.version !== 1) {
      console.error(
        `❌ FAIL: booking version is ${finalBooking?.version}, expected 1 (exactly one increment)`,
      );
      passed = false;
    }

    if (passed) {
      console.log(`\n✅ ALL ASSERTIONS PASSED — SELECT FOR UPDATE SKIP LOCKED is working correctly.\n`);
    } else {
      console.log(`\n❌ SOME ASSERTIONS FAILED — review concurrency handling.\n`);
    }

    await cleanupTestData(db, booking.id);

    process.exit(passed ? 0 : 1);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("Load test failed with unexpected error:", err);
  process.exit(1);
});
