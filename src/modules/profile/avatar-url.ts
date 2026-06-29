const AVATAR_BUCKET = "avatars";

/** Normalize Supabase project URL to origin for safe host comparison. */
export function getSupabaseProjectOrigin(supabaseUrl: string): string {
  return new URL(supabaseUrl.replace(/\/$/, "")).origin;
}

/** Validate that an avatar public URL belongs to this Supabase project and profile. */
export function assertAvatarUrlForProfile(
  avatarUrl: string,
  supabaseUrl: string,
  profileId: string,
): void {
  let parsed: URL;
  try {
    parsed = new URL(avatarUrl);
  } catch {
    throw new Error("Invalid avatar URL");
  }

  const expectedOrigin = getSupabaseProjectOrigin(supabaseUrl);
  if (parsed.origin !== expectedOrigin) {
    throw new Error("Invalid avatar URL");
  }

  const expectedSegment = `/${AVATAR_BUCKET}/${profileId}/`;
  if (!parsed.pathname.includes(expectedSegment)) {
    throw new Error("Avatar path must belong to your profile");
  }
}

/** Cache-bust query param so browsers pick up a replaced object at the same path. */
export function withAvatarCacheBust(publicUrl: string): string {
  const url = new URL(publicUrl);
  url.searchParams.set("t", String(Date.now()));
  return url.toString();
}

export { AVATAR_BUCKET };
