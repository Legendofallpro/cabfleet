"use server";

import { getSessionUser } from "@/lib/auth/session";
import { getPostAuthRedirect } from "@/lib/auth/redirects";

export async function getPostAuthRedirectAction(
  redirectTo?: string | null,
): Promise<string> {
  const session = await getSessionUser();
  if (!session) return "/signin";
  return getPostAuthRedirect(redirectTo, session.profile.role);
}
