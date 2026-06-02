/**
 * POST /api/v1/attendance/check-in — driver self-check-in.
 *
 * Drivers may only check in themselves (ATTENDANCE_SELF). The route
 * pins `profileId` from the token rather than accepting it in the body
 * so the client cannot check in another driver via this endpoint.
 */
import { z } from "zod";
import { LIMITS } from "@/lib/rate-limit";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { withApiHandler } from "@/lib/auth/withApiHandler";
import { checkIn } from "@/modules/attendance/services/attendance.service";

export const dynamic = "force-dynamic";

const schema = z.object({
  date: z.coerce.date(),
  checkIn: z.coerce.date(),
});
type Body = z.infer<typeof schema>;

export const POST = withApiHandler<Body>({
  schema,
  permission: PERMISSIONS.ATTENDANCE_SELF,
  rateLimit: { key: "attendance.checkIn", opts: LIMITS.apiWrite },
  idempotency: {},
  handler: async ({ user, body }) => {
    return checkIn(
      { profileId: user.profile.id, date: body.date, checkIn: body.checkIn },
      { id: user.profile.id },
    );
  },
});
