/**
 * Paths that do not require a session. `/` is exact-match only — never treat
 * it as a prefix, or every route would become public.
 */
export const PUBLIC_PATH_PREFIXES = [
  "/signin",
  "/signup",
  "/reset-password",
  "/set-password",
  "/claim-portal",
  "/error-404",
  "/auth-error",
  "/auth/callback",
] as const;

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
