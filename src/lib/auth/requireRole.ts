import type { Role } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { getCurrentAal } from "@/lib/auth/aal";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const STAFF_ROLES: ReadonlySet<Role> = new Set(["SUPER_ADMIN", "ADMIN", "STAFF"]);

export type RequireAuthOptions = {
  /** MFA enroll/verify/audit and similar aal1-only staff actions. */
  allowAal1?: boolean;
};

async function assertStaffAal2(
  session: SessionUser,
  opts?: RequireAuthOptions,
): Promise<void> {
  if (opts?.allowAal1) return;
  if (!env.STAFF_AAL2_REQUIRED) return;
  if (!STAFF_ROLES.has(session.profile.role)) return;
  const aal = await getCurrentAal();
  if (aal !== "aal2") {
    logger.warn(
      { profileId: session.profile.id, role: session.profile.role, aal },
      "auth.forbidden.aal2_required",
    );
    throw new AppError("FORBIDDEN", "Two-factor authentication is required.");
  }
}

/**
 * Throws AppError("UNAUTHENTICATED") if no session.
 * Throws AppError("FORBIDDEN") if role not allowed or staff AAL2 is missing.
 * Returns the session user otherwise.
 *
 * Call as the FIRST line of every server action that mutates state.
 */
export async function requireRole(
  allowed: Role[],
  opts?: RequireAuthOptions,
): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) throw new AppError("UNAUTHENTICATED", "You must sign in.");
  if (!allowed.includes(session.profile.role)) {
    throw new AppError("FORBIDDEN", "You do not have access to this resource.");
  }
  await assertStaffAal2(session, opts);
  return session;
}

export async function requirePermission(
  permission: Permission,
  opts?: RequireAuthOptions,
): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) throw new AppError("UNAUTHENTICATED", "You must sign in.");
  if (!hasPermission(session.profile.role, permission)) {
    logger.warn(
      { permission, role: session.profile.role, profileId: session.profile.id },
      "auth.forbidden.missing_permission",
    );
    throw new AppError("FORBIDDEN", "You do not have access to this resource.");
  }
  await assertStaffAal2(session, opts);
  return session;
}

export async function requireSession(opts?: RequireAuthOptions): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) throw new AppError("UNAUTHENTICATED", "You must sign in.");
  await assertStaffAal2(session, opts);
  return session;
}
