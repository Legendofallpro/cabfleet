/**
 * One-time setup for profile avatar uploads.
 *
 * Creates the public `avatars` storage bucket via the service role.
 * You must still run prisma/sql/12_avatar_storage.sql in the Supabase SQL
 * editor so authenticated users can write only under avatars/{their_uuid}/.
 *
 * Usage:
 *   npx tsx scripts/setup-avatar-bucket.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const { ensureAvatarsBucket } = await import(
    "../src/modules/profile/services/avatar-storage.service"
  );

  const result = await ensureAvatarsBucket();

  if (result.created) {
    console.log("Created storage bucket: avatars");
  } else if (result.exists) {
    console.log("Storage bucket already exists: avatars");
  }

  console.log("");
  console.log("Next step: run prisma/sql/12_avatar_storage.sql in the Supabase SQL editor");
  console.log("(creates RLS policies so users can upload only to their own folder).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
