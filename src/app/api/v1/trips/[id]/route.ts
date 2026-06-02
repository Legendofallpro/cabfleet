/**
 * GET /api/v1/trips/:id — booking detail for the active driver.
 *
 * Ownership check is the existing `getDriverBookingDetail` query: only
 * returns the row if the booking is OPEN_FOR_CLAIM in the driver's branch
 * or already owned by this driver. Anything else returns 404 (not 403)
 * via S6 ownership semantics — we don't want to confirm the existence
 * of a booking the caller has no right to know about.
 */
import { ok } from "@/lib/result";
import { LIMITS } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { withApiHandler } from "@/lib/auth/withApiHandler";
import { getDriverBookingDetail } from "@/modules/bookings/queries/driver";
import { getDriverForProfile } from "@/modules/drivers/services/eligibility";

export const dynamic = "force-dynamic";

type Params = { id: string };

export const GET = withApiHandler<undefined, Params>({
  permission: PERMISSIONS.BOOKING_VIEW,
  rateLimit: { key: "trips.detail", opts: LIMITS.apiRead },
  handler: async ({ user, params }) => {
    const driver = await getDriverForProfile(user.profile.id);
    const branchId = driver.profile.branchId;
    if (!branchId) {
      throw new AppError(
        "FORBIDDEN",
        "Your driver profile has no branch assigned.",
      );
    }
    const trip = await getDriverBookingDetail(params.id, {
      driverId: driver.id,
      branchId,
    });
    if (!trip) {
      throw new AppError("NOT_FOUND", "Trip not found.");
    }
    return ok({ trip });
  },
});
