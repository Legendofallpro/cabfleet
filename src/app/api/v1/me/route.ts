/**
 * GET /api/v1/me — current driver's profile + driver record.
 *
 * Returns the joined Profile + Driver row. Driver-only — Customer / Staff
 * use the cookie-session web portals, not v1.
 */
import { ok } from "@/lib/result";
import { LIMITS } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { withApiHandler } from "@/lib/auth/withApiHandler";

export const dynamic = "force-dynamic";

export const GET = withApiHandler({
  rateLimit: { key: "me", opts: LIMITS.apiRead },
  handler: async ({ user }) => {
    const driver = await db.driver.findFirst({
      where: { profileId: user.profile.id, deletedAt: null },
      select: {
        id: true,
        status: true,
        licenseNumber: true,
        licenseExpiry: true,
      },
    });
    if (!driver) {
      throw new AppError("FORBIDDEN", "Only driver accounts can use the v1 API.");
    }
    return ok({
      profile: {
        id: user.profile.id,
        fullName: user.profile.fullName,
        email: user.profile.email,
        phone: user.profile.phone,
        role: user.profile.role,
        orgId: user.profile.orgId,
        branchId: user.profile.branchId,
        locale: user.profile.locale,
      },
      driver,
    });
  },
});
