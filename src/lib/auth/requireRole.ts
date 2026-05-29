import type { Role } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

/**
 * Throws AppError("UNAUTHENTICATED") if no session.
 * Throws AppError("FORBIDDEN") if role not allowed.
 * Returns the session user otherwise.
 *
 * Call as the FIRST line of every server action that mutates state.
 */
export async function requireRole(allowed: Role[]): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) throw new AppError("UNAUTHENTICATED", "You must sign in.");
  if (!allowed.includes(session.profile.role)) {
    throw new AppError("FORBIDDEN", "You do not have access to this resource.");
  }
  return session;
}

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) throw new AppError("UNAUTHENTICATED", "You must sign in.");
  if (!hasPermission(session.profile.role, permission)) {
    logger.warn(
      { permission, role: session.profile.role, profileId: session.profile.id },
      "auth.forbidden.missing_permission",
    );
    throw new AppError("FORBIDDEN", "You do not have access to this resource.");
  }
  return session;
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) throw new AppError("UNAUTHENTICATED", "You must sign in.");
  return session;
}
