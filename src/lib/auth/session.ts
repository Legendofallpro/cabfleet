import { cache } from "react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import type { Profile, Role } from "@prisma/client";

export type SessionUser = {
  authId: string;
  email: string;
  profile: Profile;
};

/**
 * Reads the Supabase session and joins the matching Profile row.
 * Cached per request via React.cache so multiple callers don't hit the DB twice.
 *
 * Returns null when unauthenticated or when Profile has not yet been synced
 * (e.g. the auth.users trigger has not fired).
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await db.profile.findUnique({
    where: { id: user.id },
  });

  if (!profile) return null;

  return {
    authId: user.id,
    email: user.email ?? profile.email,
    profile,
  };
});

export async function getCurrentRole(): Promise<Role | null> {
  const session = await getSessionUser();
  return session?.profile.role ?? null;
}
