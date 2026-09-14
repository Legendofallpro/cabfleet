import type { Role } from "@prisma/client";

const AUTH_PATH_PREFIXES = [
  "/signin",
  "/signup",
  "/reset-password",
  "/set-password",
  "/claim-portal",
  "/auth/callback",
] as const;

export function getRoleHome(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN":
    case "ADMIN":
    case "STAFF":
      return "/dashboard";
    case "DRIVER":
      return "/driver";
    case "CUSTOMER":
      return "/portal";
  }
}

export function sanitizeRedirectTo(redirectTo?: string | null): string | null {
  if (!redirectTo) return null;
  if (/%2f|%5c|%40/i.test(redirectTo)) return null;

  let decoded = redirectTo;
  try {
    decoded = decodeURIComponent(redirectTo);
  } catch {
    return null;
  }

  if (!decoded.startsWith("/")) return null;
  if (decoded.startsWith("//")) return null;
  if (decoded.includes("\\") || decoded.includes("@") || decoded.includes("//")) return null;
  if (!/^[a-zA-Z0-9/_#?&=.-]+$/.test(decoded)) return null;

  const [pathname] = decoded.split(/[?#]/, 1);
  if (AUTH_PATH_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return null;
  }

  return decoded;
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
      return isSegmentMatch(redirectTo, "/portal");
    case "DRIVER":
      return isSegmentMatch(redirectTo, "/driver");
    case "SUPER_ADMIN":
    case "ADMIN":
    case "STAFF":
      return !isSegmentMatch(redirectTo, "/portal") && !isSegmentMatch(redirectTo, "/driver");
  }
}

export function getPostAuthRedirect(redirectTo: string | null | undefined, role: Role): string {
  const safeRedirect = sanitizeRedirectTo(redirectTo);
  if (!safeRedirect || safeRedirect === "/") return getRoleHome(role);

  return isRedirectAllowedForRole(safeRedirect, role) ? safeRedirect : getRoleHome(role);
}
