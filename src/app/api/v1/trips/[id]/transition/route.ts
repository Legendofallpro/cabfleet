/**
 * POST /api/v1/trips/:id/transition — driver advances a trip status.
 *
 * Drivers may only transition to one of DRIVER_ALLOWED_TARGETS
 * (DRIVER_EN_ROUTE → IN_PROGRESS → COMPLETED, or NO_SHOW). The state
 * machine in `transitionBookingStatus` rejects illegal transitions, but
 * we ALSO gate at the route boundary so an unauthorised target produces
 * a clean 400 with a typed VALIDATION error rather than a 409.
 *
 * Ownership: bookings.id must belong to (claimedByDriverId | assignedDriverId)
 * = the calling driver. Enforced via the `ownership` callback so the
 * caller sees a 404 when they don't own it, not a 403.
 */
import { z } from "zod";
import { BookingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ok } from "@/lib/result";
import { LIMITS } from "@/lib/rate-limit";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { withApiHandler } from "@/lib/auth/withApiHandler";
import { transitionBookingStatus } from "@/modules/bookings/services/transitionBookingStatus";
import { DRIVER_ALLOWED_TARGETS } from "@/modules/bookings/booking.constants";
import { getDriverForProfile } from "@/modules/drivers/services/eligibility";

export const dynamic = "force-dynamic";

type Params = { id: string };

const transitionSchema = z
  .object({
    toStatus: z.enum(BookingStatus),
    reason: z.string().max(300).optional(),
  })
  .refine((d) => DRIVER_ALLOWED_TARGETS.includes(d.toStatus), {
    message:
      "Drivers can only transition to DRIVER_EN_ROUTE, IN_PROGRESS, COMPLETED, or NO_SHOW.",
    path: ["toStatus"],
  });

type Body = z.infer<typeof transitionSchema>;

export const POST = withApiHandler<Body, Params>({
  schema: transitionSchema,
  permission: PERMISSIONS.BOOKING_VIEW,
  rateLimit: { key: "trips.transition", opts: LIMITS.apiWrite },
  idempotency: {},
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
    const result = await transitionBookingStatus(params.id, {
      toStatus: body.toStatus,
      byProfileId: user.profile.id,
      reason: body.reason,
    });
    if (!result.ok) return result;
    return ok({ id: result.data.id, status: result.data.status });
  },
});
