/**
 * POST /api/v1/trips/:id/location — single live-location point.
 *
 * Ownership: only the assigned/claimed driver may post. The booking's
 * `locationConsentAt` must be set (§S15); otherwise the service returns
 * FORBIDDEN.
 */
import { LIMITS } from "@/lib/rate-limit";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { withApiHandler } from "@/lib/auth/withApiHandler";
import { db } from "@/lib/db";
import { locationPointSchema } from "@/modules/tracking/validators/location";
import { recordLocation } from "@/modules/tracking/services/recordLocation";
import { getDriverForProfile } from "@/modules/drivers/services/eligibility";

export const dynamic = "force-dynamic";

type Body = import("@/modules/tracking/validators/location").LocationPointInput;
type Params = { id: string };

export const POST = withApiHandler<Body, Params>({
  schema: locationPointSchema,
  permission: PERMISSIONS.BOOKING_VIEW,
  rateLimit: { key: "trips.location", opts: LIMITS.apiLocation },
  ownership: async ({ user, params }) => {
    const driver = await getDriverForProfile(user.profile.id);
    const booking = await db.booking.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
        OR: [
          { claimedByDriverId: driver.id },
          { assignedDriverId: driver.id },
        ],
      },
      select: { id: true },
    });
    return Boolean(booking);
  },
  handler: async ({ user, body, params }) => {
    const driver = await getDriverForProfile(user.profile.id);
    return recordLocation({
      bookingId: params.id,
      driverId: driver.id,
      points: [body],
    });
  },
});
