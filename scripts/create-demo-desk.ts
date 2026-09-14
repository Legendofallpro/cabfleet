/**
 * One-off sandbox helper: ADMIN + DRIVER + a vehicle on the HQ branch.
 * Run: npx tsx scripts/create-demo-desk.ts
 */
import { randomBytes } from "crypto";
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: ".env.local" });
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl = process.env.DATABASE_URL;

if (!url || !serviceKey || !dbUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DATABASE_URL in .env.local",
  );
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const adapter = new PrismaPg({ connectionString: dbUrl });
const db = new PrismaClient({ adapter });

const STAFF_EMAIL = "staff.demo@cabfleet.local";
const DRIVER_EMAIL = "driver.demo@cabfleet.local";
const password = `CabFleet${randomBytes(4).toString("hex")}!`;

async function waitForProfile(userId: string) {
  for (let i = 0; i < 10; i++) {
    const profile = await db.profile.findUnique({ where: { id: userId } });
    if (profile) return profile;
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

async function upsertAuthUser(email: string, fullName: string) {
  const existingAuth = await supabase.auth.admin.listUsers();
  const existing = existingAuth.data.users.find((u) => u.email === email);
  if (existing) {
    const reset = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (reset.error) throw new Error(reset.error.message);
    return existing.id;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw new Error(error?.message ?? "createUser failed");
  await waitForProfile(data.user.id);
  return data.user.id;
}

async function main() {
  const org = await db.organization.findFirst({
    where: { slug: "default", deletedAt: null },
  });
  const branch = await db.branch.findFirst({
    where: { code: "HQ", deletedAt: null },
  });
  if (!org || !branch) {
    throw new Error("Default org or HQ branch missing. Run `npx prisma db seed`.");
  }

  const staffId = await upsertAuthUser(STAFF_EMAIL, "Demo Staff");
  await db.profile.upsert({
    where: { id: staffId },
    create: {
      id: staffId,
      email: STAFF_EMAIL,
      fullName: "Demo Staff",
      phone: "+919876500001",
      role: "ADMIN",
      orgId: org.id,
      branchId: branch.id,
    },
    update: {
      email: STAFF_EMAIL,
      fullName: "Demo Staff",
      role: "ADMIN",
      orgId: org.id,
      branchId: branch.id,
    },
  });
  await db.staff.upsert({
    where: { profileId: staffId },
    create: {
      profileId: staffId,
      orgId: org.id,
      employeeId: "DEMO-STAFF-1",
      designation: "SUPPORT",
      status: "ACTIVE",
    },
    update: { orgId: org.id, status: "ACTIVE" },
  });

  const driverId = await upsertAuthUser(DRIVER_EMAIL, "Demo Driver");
  await db.profile.upsert({
    where: { id: driverId },
    create: {
      id: driverId,
      email: DRIVER_EMAIL,
      fullName: "Demo Driver",
      phone: "+919876500002",
      role: "DRIVER",
      orgId: org.id,
      branchId: branch.id,
    },
    update: {
      email: DRIVER_EMAIL,
      fullName: "Demo Driver",
      role: "DRIVER",
      orgId: org.id,
      branchId: branch.id,
    },
  });
  const licenseExpiry = new Date();
  licenseExpiry.setFullYear(licenseExpiry.getFullYear() + 3);
  await db.driver.upsert({
    where: { profileId: driverId },
    create: {
      profileId: driverId,
      orgId: org.id,
      licenseNumber: "KA01DEMO0001",
      licenseExpiry,
      status: "ACTIVE",
      verification: "VERIFIED",
    },
    update: {
      orgId: org.id,
      status: "ACTIVE",
      verification: "VERIFIED",
      licenseExpiry,
    },
  });

  await db.vehicle.upsert({
    where: { registrationNumber: "KA01DE0001" },
    create: {
      orgId: org.id,
      branchId: branch.id,
      registrationNumber: "KA01DE0001",
      make: "Toyota",
      model: "Etios",
      year: 2022,
      type: "SEDAN",
      capacity: 4,
      status: "AVAILABLE",
    },
    update: {
      orgId: org.id,
      branchId: branch.id,
      status: "AVAILABLE",
    },
  });

  console.log(
    JSON.stringify(
      {
        password,
        staff: { email: STAFF_EMAIL, signInUrl: "http://localhost:3000/signin?redirectTo=/dashboard" },
        driver: { email: DRIVER_EMAIL, signInUrl: "http://localhost:3000/signin?redirectTo=/driver" },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
