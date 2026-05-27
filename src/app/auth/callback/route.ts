import { NextResponse, type NextRequest } from "next/server";

import { getCallbackRedirect, getCallbackPasswordMode, normalizeRedirectParam } from "@/lib/auth/callback";
import { getRawAuthUser, getSessionUser } from "@/lib/auth/session";
import {
  createProof,
  PROOF_COOKIE_NAME,
  PROOF_COOKIE_OPTIONS,
  PROOF_COOKIE_CLEAR_OPTIONS,
} from "@/lib/auth/password-setup-proof";
import { sanitizeRedirectTo } from "@/lib/auth/redirects";
import { logger } from "@/lib/logger";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type SupportedOtpType = "invite" | "recovery" | "magiclink" | "signup" | "email";

function redirectTo(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

function redirectWithClearedProof(request: NextRequest, pathname: string) {
  const response = redirectTo(request, pathname);
  response.cookies.set(PROOF_COOKIE_NAME, "", PROOF_COOKIE_CLEAR_OPTIONS);
  return response;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  // Accept both the app's `next` convention and Supabase's `redirect_to` naming.
  const next = params.get("next");
  const redirectToParam = params.get("redirect_to");
  const mode = params.get("mode");

  const supabase = await getSupabaseServerClient();

  if (tokenHash && type) {
    // Primary path: token_hash links from Supabase email templates.
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as SupportedOtpType,
    });

    if (error) {
      logger.warn({ err: error, type, next, mode }, "Supabase OTP verification failed");
      return redirectWithClearedProof(request, "/set-password");
    }
  } else if (code) {
    // Fallback: PKCE code exchange for backward compatibility.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      logger.warn({ err: error, type, next, mode }, "Supabase code exchange failed");
      return redirectWithClearedProof(request, "/set-password");
    }
  } else {
    logger.warn({ type, next, mode }, "Auth callback missing token payload");
    return redirectWithClearedProof(request, "/set-password");
  }

  // Verification succeeded. Check whether the Profile row exists.
  const rawUser = await getRawAuthUser();
  if (!rawUser) {
    // Should not happen immediately after a successful verify, but guard anyway.
    logger.error({ type }, "Auth callback: no raw user after successful verification");
    return redirectWithClearedProof(request, "/set-password");
  }

  const passwordMode = getCallbackPasswordMode(type, mode);

  if (passwordMode) {
    // Invite or recovery flow: check if the Profile row exists so we can give
    // a meaningful error instead of silently failing later.
    let session: Awaited<ReturnType<typeof getSessionUser>> = null;
    try {
      session = await getSessionUser();
    } catch (dbErr) {
      logger.error({ err: dbErr, authUserId: rawUser.id, passwordMode }, "Auth callback: DB error during profile check");
    }
    if (!session) {
      // Auth verified but Profile row is missing — provisioning hasn't fired.
      logger.warn({ authUserId: rawUser.id, type }, "Auth callback: profile not yet provisioned");
      return redirectWithClearedProof(request, "/auth-error?reason=provisioning");
    }

    // Issue the short-lived signed proof cookie so /set-password can verify
    // that the browser arrived via a legitimate callback, not direct navigation.
    const intendedRedirect =
      normalizeRedirectParam(next, redirectToParam) ?? "/";
    const proof = createProof(rawUser.id, passwordMode, intendedRedirect);

    const response = redirectTo(request, `/set-password?mode=${passwordMode}`);
    response.cookies.set(PROOF_COOKIE_NAME, proof, PROOF_COOKIE_OPTIONS);
    return response;
  }

  // Non-password flow (magic link, signup confirmation, etc.)
  const session = await getSessionUser();
  if (!session) {
    logger.warn({ authUserId: rawUser.id, type }, "Auth callback: profile not yet provisioned");
    return redirectWithClearedProof(request, "/auth-error?reason=provisioning");
  }

  const safeNext = sanitizeRedirectTo(next) ?? sanitizeRedirectTo(redirectToParam);
  const destination = getCallbackRedirect({
    type,
    mode,
    next: safeNext,
    role: session.profile.role,
  });

  return redirectTo(request, destination);
}
