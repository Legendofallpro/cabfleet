/**
 * POST /api/v1/trips/:id/location/batch — batched live-location ingest.
 *
 * Body capped at 16 KiB (≈60 points × ~250B each); validated to 1–60
 * points by the zod schema.
 */
import { LIMITS } from "@/lib/rate-limit";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { withApiHandler } from "@/lib/auth/withApiHandler";
import { db } from "@/lib/db";
import { locationBatchSchema } from "@/modules/tracking/validators/location";
import { recordLocation } from "@/modules/tracking/services/recordLocation";
import { getDriverForProfile } from "@/modules/drivers/services/eligibility";

export const dynamic = "force-dynamic";

type Body = import("@/modules/tracking/validators/location").LocationBatchInput;
type Params = { id: string };

export const POST = withApiHandler<Body, Params>({
  schema: locationBatchSchema,
  maxBodyBytes: 16 * 1024,
  permission: PERMISSIONS.BOOKING_VIEW,
  rateLimit: { key: "trips.location.batch", opts: LIMITS.apiLocation },
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
      points: body.points,
    });
  },
});
