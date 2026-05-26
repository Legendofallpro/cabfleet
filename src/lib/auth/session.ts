import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import type { Profile, Role } from "@prisma/client";

export type SessionUser = {
  authId: string;
  email: string;
  profile: Profile;
};

/**
 * Returns the raw Supabase auth user if a valid session exists, regardless of
 * whether the app `Profile` row has been provisioned yet.
 *
 * Use this when you need to know "is the browser signed in at the Supabase
 * level?" without requiring a fully synced profile (e.g. the callback route
 * and `/set-password` gate).
 *
 * Returns null when no valid session exists.
 */
export const getRawAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

/**
 * Reads the Supabase session and joins the matching Profile row.
 * Cached per request via React.cache so multiple callers don't hit the DB twice.
 *
 * Returns null when unauthenticated OR when Profile has not yet been synced.
 * If you need to distinguish these cases, call getRawAuthUser() separately.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const user = await getRawAuthUser();
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
