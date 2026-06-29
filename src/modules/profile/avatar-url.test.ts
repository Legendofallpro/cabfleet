import { describe, expect, it } from "vitest";

import {
  assertAvatarUrlForProfile,
  getSupabaseProjectOrigin,
  withAvatarCacheBust,
} from "@/modules/profile/avatar-url";

describe("avatar-url", () => {
  const supabaseUrl = "https://abc.supabase.co";
  const profileId = "11111111-1111-1111-1111-111111111111";

  it("normalizes supabase origin", () => {
    expect(getSupabaseProjectOrigin("https://abc.supabase.co/")).toBe("https://abc.supabase.co");
  });

  it("accepts valid public avatar URL", () => {
    const url = `https://abc.supabase.co/storage/v1/object/public/avatars/${profileId}/avatar.jpg`;
    expect(() => assertAvatarUrlForProfile(url, supabaseUrl, profileId)).not.toThrow();
  });

  it("rejects wrong host", () => {
    const url = `https://evil.com/storage/v1/object/public/avatars/${profileId}/avatar.jpg`;
    expect(() => assertAvatarUrlForProfile(url, supabaseUrl, profileId)).toThrow(
      "Invalid avatar URL",
    );
  });

  it("rejects wrong profile folder", () => {
    const url =
      "https://abc.supabase.co/storage/v1/object/public/avatars/other-user/avatar.jpg";
    expect(() => assertAvatarUrlForProfile(url, supabaseUrl, profileId)).toThrow(
      "Avatar path must belong to your profile",
    );
  });

  it("adds cache-bust query param", () => {
    const busted = withAvatarCacheBust(
      "https://abc.supabase.co/storage/v1/object/public/avatars/x/avatar.jpg",
    );
    expect(busted).toMatch(/\?t=\d+$/);
  });
});
