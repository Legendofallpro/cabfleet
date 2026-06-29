import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { AVATAR_BUCKET } from "@/modules/profile/avatar-url";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const FILE_SIZE_LIMIT = 2 * 1024 * 1024;

export type EnsureAvatarsBucketResult = {
  created: boolean;
  exists: boolean;
  policiesRequired: boolean;
};

/**
 * Ensures the public avatars bucket exists (service role).
 * Storage RLS policies still require prisma/sql/12_avatar_storage.sql in Supabase.
 */
export async function ensureAvatarsBucket(): Promise<EnsureAvatarsBucketResult> {
  const supabase = getSupabaseAdminClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`Could not list storage buckets: ${listError.message}`);
  }

  const existing = buckets?.some((b) => b.id === AVATAR_BUCKET || b.name === AVATAR_BUCKET);
  if (existing) {
    return { created: false, exists: true, policiesRequired: true };
  }

  const { error: createError } = await supabase.storage.createBucket(AVATAR_BUCKET, {
    public: true,
    fileSizeLimit: FILE_SIZE_LIMIT,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });

  if (createError) {
    throw new Error(`Could not create avatars bucket: ${createError.message}`);
  }

  return { created: true, exists: true, policiesRequired: true };
}
