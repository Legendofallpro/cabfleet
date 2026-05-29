import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { checkLimit, getClientIp, LIMITS } from "@/lib/rate-limit";

const PUBLIC_PATHS = [
  "/signin",
  "/signup",
  "/reset-password",
  "/set-password",
  "/error-404",
  "/auth-error",
  "/auth/callback",
];

/** Paths that should be IP rate-limited at the edge (anti brute-force). */
const AUTH_PATHS = ["/signin", "/signup", "/reset-password", "/auth/callback"];

const isPublic = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

const isAuthPath = (pathname: string) =>
  AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

const isStatic = (pathname: string) =>
  pathname.startsWith("/_next") ||
  /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff2?)$/.test(pathname);

function rateLimitResponse(resetAt: number) {
  return new NextResponse("Too many requests", {
    status: 429,
    headers: {
      "Retry-After": Math.max(
        1,
        Math.ceil((resetAt - Date.now()) / 1000),
      ).toString(),
    },
  });
}

/**
 * Coarse routing guard. Refreshes the Supabase session cookie on every request,
 * then enforces "must be signed in" for non-public, non-static paths.
 *
 * Per-route role enforcement happens in route layouts + server actions
 * (see `requireRole` / `requirePermission`), because the middleware does not
 * have access to the Profile.role without an extra DB roundtrip per request.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStatic(pathname)) return NextResponse.next();

  const ip = getClientIp(request);

  // Coarse IP rate-limit on auth + API paths to dampen brute-force / abuse.
  if (isAuthPath(pathname)) {
    const limit = checkLimit(`auth:${ip}`, LIMITS.auth);
    if (!limit.success) return rateLimitResponse(limit.resetAt);
  } else if (pathname.startsWith("/api/")) {
    const limit = checkLimit(`api:${ip}:${pathname}`, LIMITS.api);
    if (!limit.success) return rateLimitResponse(limit.resetAt);
  }

  // API routes manage their own auth (e.g. cron bearer); skip Supabase session
  // refresh to avoid double cookie work on each cron tick.
  if (pathname.startsWith("/api/")) return NextResponse.next();

  const { response, user } = await updateSession(request);

  // Bounce signed-in users away from sign-in / sign-up to their portal.
  if (user && (pathname === "/signin" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image
     * - favicon.ico
     * - public files (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|images|fonts).*)",
  ],
};
