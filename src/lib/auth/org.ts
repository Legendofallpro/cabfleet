/**
 * Org-resolution helpers (Phase 7 W1).
 *
 * `requireOrg` is the request-lifecycle counterpart to `requireRole` /
 * `requirePermission` in [requireRole.ts](./requireRole.ts) — it asserts the
 * caller has an `orgId` and returns it for downstream services.
 *
 * SUPER_ADMIN profiles have a NULL `orgId` and cannot use `requireOrg`. They
 * must opt into cross-org operations via `runWithoutOrg(...)` explicitly.
 */
import { AppError } from "@/lib/errors";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";

/**
 * Returns the active org id from the signed-in session. Throws when:
 *  - No session is present
 *  - The session's profile is SUPER_ADMIN (no orgId)
 *  - The session's profile somehow lacks an orgId despite the CHECK constraint
 */
export async function requireOrg(): Promise<{
  orgId: string;
  session: SessionUser;
}> {
  const session = await getSessionUser();
  if (!session) {
    throw new AppError("UNAUTHENTICATED", "Sign in required.");
  }
  if (!session.profile.orgId) {
    throw new AppError(
      "FORBIDDEN",
      "This action requires an organization context.",
    );
  }
  return { orgId: session.profile.orgId, session };
}
