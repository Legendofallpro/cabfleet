/**
 * GET /api/v1/trips/open — bookings in OPEN_FOR_CLAIM for the driver's
 * branch.
 *
 * Reuses `listOpenForClaimBookings` exactly as the web driver portal
 * does. The org-level tenant filter comes through automatically via the
 * Prisma extension (W1) — the wrapper sets org context before the body
 * runs.
 */
import { ok } from "@/lib/result";
import { LIMITS } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { withApiHandler } from "@/lib/auth/withApiHandler";
import { listOpenForClaimBookings } from "@/modules/bookings/queries/driver";
import { getDriverForProfile } from "@/modules/drivers/services/eligibility";

export const dynamic = "force-dynamic";

export const GET = withApiHandler({
  permission: PERMISSIONS.BOOKING_VIEW,
  rateLimit: { key: "trips.open", opts: LIMITS.apiRead },
  handler: async ({ user }) => {
    const driver = await getDriverForProfile(user.profile.id);
    const branchId = driver.profile.branchId;
    if (!branchId) {
      throw new AppError(
        "FORBIDDEN",
        "Your driver profile has no branch assigned.",
      );
    }
    const trips = await listOpenForClaimBookings(branchId);
    return ok({ trips });
  },
});
