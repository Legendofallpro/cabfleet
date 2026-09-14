/**
 * One-off dev helper: create a CUSTOMER account for the portal.
 * Run: npx tsx scripts/create-demo-customer.ts
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

const email = "customer.demo@cabfleet.local";
const password = `CabFleet${randomBytes(4).toString("hex")}!`;
const fullName = "Demo Customer";

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const adapter = new PrismaPg({ connectionString: dbUrl });
const db = new PrismaClient({ adapter });

async function waitForProfile(userId: string) {
  for (let i = 0; i < 10; i++) {
    const profile = await db.profile.findUnique({ where: { id: userId } });
    if (profile) return profile;
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

async function getDefaultOrgId(): Promise<string> {
  const org = await db.organization.findFirst({
    where: { slug: "default", deletedAt: null },
    select: { id: true },
  });
  if (!org) {
    throw new Error("Default organization not found. Run `npx prisma db seed` first.");
  }
  return org.id;
}

async function main() {
  const orgId = await getDefaultOrgId();
  const existingAuth = await supabase.auth.admin.listUsers();
  const existingUser = existingAuth.data.users.find((u) => u.email === email);

  if (existingUser) {
    const profile = await db.profile.findFirst({
      where: { id: existingUser.id, deletedAt: null },
    });

    const reset = await supabase.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (reset.error) {
      throw new Error(`Failed to reset password: ${reset.error.message}`);
    }

    await db.profile.upsert({
      where: { id: existingUser.id },
      create: {
        id: existingUser.id,
        email,
        fullName,
        role: "CUSTOMER",
        orgId,
      },
      update: { email, fullName, role: "CUSTOMER", orgId },
    });

    await db.customer.upsert({
      where: { profileId: existingUser.id },
      create: { profileId: existingUser.id, orgId },
      update: { orgId },
    });

    console.log(
      JSON.stringify(
        {
          status: "reset",
          email,
          password,
          profileId: profile?.id ?? existingUser.id,
          signInUrl: "http://localhost:3000/signin?redirectTo=/portal",
          portalUrl: "http://localhost:3000/portal",
        },
        null,
        2,
      ),
    );
    return;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Supabase createUser failed");
  }

  const userId = data.user.id;
  await waitForProfile(userId);

  await db.profile.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email,
      fullName,
      role: "CUSTOMER",
      orgId,
    },
    update: { email, fullName, role: "CUSTOMER", orgId },
  });

  await db.customer.upsert({
    where: { profileId: userId },
    create: { profileId: userId, orgId },
    update: { orgId },
  });

  console.log(
    JSON.stringify(
      {
        status: "created",
        email,
        password,
        profileId: userId,
        signInUrl: "http://localhost:3000/signin?redirectTo=/portal",
        portalUrl: "http://localhost:3000/portal",
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
