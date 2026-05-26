import type { Role } from "@prisma/client";

const AUTH_PATH_PREFIXES = [
  "/signin",
  "/signup",
  "/reset-password",
  "/set-password",
  "/auth/callback",
] as const;

export function getRoleHome(role: Role): string {
  switch (role) {
    case "ADMIN":
    case "STAFF":
      return "/";
    case "DRIVER":
      return "/driver";
    case "CUSTOMER":
      return "/portal";
  }
}

export function sanitizeRedirectTo(redirectTo?: string | null): string | null {
  if (!redirectTo) return null;
  if (!redirectTo.startsWith("/")) return null;
  if (redirectTo.startsWith("//")) return null;
  const [pathname] = redirectTo.split(/[?#]/, 1);
  if (AUTH_PATH_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return null;
  }

  return redirectTo;
}

function isSegmentMatch(redirectTo: string, segment: string): boolean {
  // Strip query/hash before segment check so "/portal?x=1" and "/portal/book"
  // both match, but "/portalfoo" does not.
  const [pathname] = redirectTo.split(/[?#]/, 1);
  return pathname === segment || pathname.startsWith(`${segment}/`);
}

function isRedirectAllowedForRole(redirectTo: string, role: Role): boolean {
  switch (role) {
    case "CUSTOMER":
      return redirectTo === "/" || isSegmentMatch(redirectTo, "/portal");
    case "DRIVER":
      return redirectTo === "/" || isSegmentMatch(redirectTo, "/driver");
    case "ADMIN":
    case "STAFF":
      return !isSegmentMatch(redirectTo, "/portal") && !isSegmentMatch(redirectTo, "/driver");
  }
}

export function getPostAuthRedirect(redirectTo: string | null | undefined, role: Role): string {
  const safeRedirect = sanitizeRedirectTo(redirectTo);
  if (!safeRedirect) return getRoleHome(role);

  return isRedirectAllowedForRole(safeRedirect, role) ? safeRedirect : getRoleHome(role);
}
