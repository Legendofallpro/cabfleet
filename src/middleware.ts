import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = [
  "/signin",
  "/signup",
  "/reset-password",
  "/error-404",
  "/auth/callback",
];

const isPublic = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

const isStatic = (pathname: string) =>
  pathname.startsWith("/_next") ||
  pathname.startsWith("/api/") ||
  /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff2?)$/.test(pathname);

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

  const { response, user } = await updateSession(request);

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
