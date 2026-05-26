import type { Role } from "@prisma/client";

import { getPostAuthRedirect, getRoleHome, sanitizeRedirectTo } from "@/lib/auth/redirects";

export function getSetPasswordMode(mode: string | undefined): "invite" | "recovery" | null {
  if (mode === "invite" || mode === "recovery") return mode;

  return null;
}

export function getCallbackPasswordMode(
  type: string | null,
  mode: string | null,
): "invite" | "recovery" | null {
  const setPasswordMode = getSetPasswordMode(mode ?? undefined);
  if (setPasswordMode) return setPasswordMode;
  if (type === "invite") return "invite";
  if (type === "recovery") return "recovery";

  return null;
}

/**
 * Normalizes the intended post-auth redirect target from all the different
 * naming conventions that Supabase and the app may use:
 * - `next` (app-local convention)
 * - `redirect_to` (Supabase email-template convention)
 *
 * Returns a sanitized local path or null if neither is present / valid.
 */
export function normalizeRedirectParam(
  next: string | null,
  redirectTo: string | null,
): string | null {
  return sanitizeRedirectTo(next) ?? sanitizeRedirectTo(redirectTo);
}

export function getCallbackRedirect({
  type,
  mode,
  next,
  redirectTo,
  role,
}: {
  type: string | null;
  mode: string | null;
  next: string | null;
  /** Supabase-template-friendly alias for `next` */
  redirectTo?: string | null;
  role?: Role | null;
}): string {
  const passwordMode = getCallbackPasswordMode(type, mode);
  if (passwordMode) {
    // The proof cookie carries the redirect target; the URL query param is
    // kept only for display/UX so the page knows which copy to show.
    return `/set-password?mode=${passwordMode}`;
  }

  const destination = normalizeRedirectParam(next, redirectTo ?? null);

  if (role) {
    return getPostAuthRedirect(destination, role);
  }

  return destination ?? getRoleHome("CUSTOMER");
}
