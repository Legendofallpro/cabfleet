/**
 * GET /api/v1/trips/mine — bookings the driver has claimed or been
 * assigned. Mirrors the web driver portal listing.
 */
import { ok } from "@/lib/result";
import { LIMITS } from "@/lib/rate-limit";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { withApiHandler } from "@/lib/auth/withApiHandler";
import { listMyTrips } from "@/modules/bookings/queries/driver";
import { getDriverForProfile } from "@/modules/drivers/services/eligibility";

export const dynamic = "force-dynamic";

export const GET = withApiHandler({
  permission: PERMISSIONS.BOOKING_VIEW,
  rateLimit: { key: "trips.mine", opts: LIMITS.apiRead },
  handler: async ({ user }) => {
    const driver = await getDriverForProfile(user.profile.id);
    const trips = await listMyTrips(driver.id);
    return ok({ trips });
  },
});
