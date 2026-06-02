/**
 * REST v1 authentication (Phase 7 W4 §4.1 + S1).
 *
 * Why a parallel auth path?
 * -------------------------
 * The web app reads the Supabase session from cookies via the SSR helper.
 * Native mobile clients (the eventual driver app) can't ship cookies the
 * way browsers do — they hold a JWT in secure storage and present it as
 * `Authorization: Bearer <jwt>` on every request.
 *
 * S1: jose.jwtVerify against Supabase JWKS with pinned algorithms.
 *
 * Algorithm pinning
 * -----------------
 * Two acceptable paths:
 *   1. ASYMMETRIC (preferred): Supabase project with "asymmetric signing
 *      key" enabled. Tokens are RS256 / ES256 signed; verification fetches
 *      the JWKS once and caches it. This is what S1 specifies.
 *   2. LEGACY HS256: older Supabase projects still using the symmetric
 *      JWT secret. Opt in via `SUPABASE_JWT_LEGACY_SECRET`. We accept
 *      HS256 only when that env var is set, so an attacker who forges an
 *      `alg: HS256` token against a JWKS-protected project cannot trick
 *      us into accepting it (alg-confusion class).
 *
 * The Profile lookup runs WITHOUT org context (the caller's orgId is
 * what we're about to resolve). The wrapper then sets org context for
 * the actual handler body.
 */
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyResult,
} from "jose";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { runWithoutOrg } from "@/lib/org-context";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Lazy, module-singleton JWKS handle. `jose.createRemoteJWKSet` returns a
 * function that internally caches keys (default 10 min) and dedupes
 * concurrent fetches. Created on first use so module load doesn't depend
 * on the network.
 */
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (jwks) return jwks;
  const base = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const url = new URL(`${base}/auth/v1/.well-known/jwks.json`);
  jwks = createRemoteJWKSet(url, {
    // Default cool-down + cache; explicit values are documented for ops.
    cooldownDuration: 30_000,
    cacheMaxAge: 10 * 60_000,
  });
  return jwks;
}

const ASYMMETRIC_ALGS = ["RS256", "RS384", "RS512", "ES256", "ES384"] as const;

function legacySecretKey(): Uint8Array {
  if (!env.SUPABASE_JWT_LEGACY_SECRET) {
    // Defensive — call sites already guarded this branch.
    throw new AppError("INTERNAL", "Legacy JWT secret not configured.");
  }
  return new TextEncoder().encode(env.SUPABASE_JWT_LEGACY_SECRET);
}

type VerifiedClaims = JWTPayload & {
  sub?: string;
  email?: string;
  role?: string;
  /** Custom claims from 06_profile_sync_org.sql Supabase hook. */
  profile_role?: string;
  org_id?: string | null;
};

async function verifyToken(token: string): Promise<VerifiedClaims> {
  let result: JWTVerifyResult<VerifiedClaims>;
  try {
    if (env.SUPABASE_JWT_LEGACY_SECRET) {
      // Legacy: HS256 only. NEVER also accept asymmetric here — that
      // would re-open the alg-confusion door we explicitly closed above.
      result = await jwtVerify<VerifiedClaims>(token, legacySecretKey(), {
        algorithms: ["HS256"],
        issuer: `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/auth/v1`,
      });
    } else {
      result = await jwtVerify<VerifiedClaims>(token, getJwks(), {
        // S1: pin algorithms. Reject `alg: none`, `alg: HS256`, etc.
        algorithms: Array.from(ASYMMETRIC_ALGS),
        issuer: `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/auth/v1`,
      });
    }
  } catch (err) {
    // jose throws JWSSignatureVerificationFailed, JWTExpired, etc. We do
    // NOT leak which one to the client — `Bearer` is the only contract.
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "api.auth.jwt_verify_failed",
    );
    throw new AppError("UNAUTHENTICATED", "Invalid or expired token.");
  }
  return result.payload;
}

/**
 * Extract the bearer token from the Authorization header.
 *
 * Header parser, not a security check. Returns null on any malformed
 * shape so callers can return a uniform 401 without leaking parser
 * state to the client.
 */
function extractBearer(req: Request): string | null {
  const raw = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!raw) return null;
  const [scheme, value, ...rest] = raw.split(/\s+/);
  if (!scheme || !value || rest.length > 0) return null;
  if (scheme.toLowerCase() !== "bearer") return null;
  return value.trim() || null;
}

/**
 * Verify a request's `Authorization: Bearer <jwt>` header and resolve
 * the matching Profile.
 *
 * Throws AppError("UNAUTHENTICATED") for missing/invalid/expired tokens
 * and for tokens whose `sub` no longer matches a Profile row (deleted
 * user, half-deprovisioned account).
 */
export async function requireApiAuth(req: Request): Promise<SessionUser> {
  const token = extractBearer(req);
  if (!token) {
    throw new AppError("UNAUTHENTICATED", "Missing bearer token.");
  }

  const claims = await verifyToken(token);
  const sub = typeof claims.sub === "string" ? claims.sub : null;
  if (!sub) {
    throw new AppError("UNAUTHENTICATED", "Token is missing the subject claim.");
  }

  // Profile lookup runs in BYPASS — we're resolving WHICH org the caller
  // belongs to. The wrapper then sets the correct org context.
  const profile = await runWithoutOrg("api.auth.profile_lookup", () =>
    db.profile.findUnique({ where: { id: sub } }),
  );
  if (!profile) {
    // We accept the JWT signature but the Profile is gone — treat as
    // unauthenticated rather than 404, to match the cookie-session
    // behaviour in getSessionUser().
    throw new AppError("UNAUTHENTICATED", "Account is no longer active.");
  }

  return {
    authId: sub,
    email: typeof claims.email === "string" ? claims.email : profile.email,
    profile,
  };
}
