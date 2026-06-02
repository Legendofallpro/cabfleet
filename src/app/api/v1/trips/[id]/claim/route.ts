/**
 * POST /api/v1/trips/:id/claim — driver claims an OPEN_FOR_CLAIM booking.
 *
 * Idempotency-Key is honoured (24h response cache). A network retry by
 * the mobile app under the same key replays the original response
 * without re-running the claim — protects against double-claim attempts
 * caused by flaky cellular connections.
 *
 * Eligibility (driver status + branch match) lives in
 * `ensureCanClaim`. The actual concurrency-safe claim is `claimBooking`.
 */
import { ok } from "@/lib/result";
import { LIMITS } from "@/lib/rate-limit";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { withApiHandler } from "@/lib/auth/withApiHandler";
import { claimBooking } from "@/modules/bookings/services/claimBooking";
import { ensureCanClaim } from "@/modules/drivers/services/eligibility";

export const dynamic = "force-dynamic";

type Params = { id: string };

export const POST = withApiHandler<undefined, Params>({
  permission: PERMISSIONS.BOOKING_CLAIM,
  rateLimit: { key: "trips.claim", opts: LIMITS.apiClaim },
  idempotency: {},
  handler: async ({ user, params }) => {
    const eligibility = await ensureCanClaim(user.profile.id, params.id);
    if (!eligibility.ok) return eligibility;

    const result = await claimBooking({
      bookingId: params.id,
      driverId: eligibility.data.id,
      byProfileId: user.profile.id,
    });
    if (!result.ok) return result;

    return ok({
      id: result.data.id,
      status: result.data.status,
      claimedAt: result.data.claimedAt,
    });
  },
});
