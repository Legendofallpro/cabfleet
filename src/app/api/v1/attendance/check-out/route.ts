/**
 * POST /api/v1/attendance/check-out — driver self-check-out.
 */
import { z } from "zod";
import { LIMITS } from "@/lib/rate-limit";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { withApiHandler } from "@/lib/auth/withApiHandler";
import { checkOut } from "@/modules/attendance/services/attendance.service";

export const dynamic = "force-dynamic";

const schema = z.object({
  date: z.coerce.date(),
  checkOut: z.coerce.date(),
});
type Body = z.infer<typeof schema>;

export const POST = withApiHandler<Body>({
  schema,
  permission: PERMISSIONS.ATTENDANCE_SELF,
  rateLimit: { key: "attendance.checkOut", opts: LIMITS.apiWrite },
  idempotency: {},
  handler: async ({ user, body }) => {
    return checkOut(
      { profileId: user.profile.id, date: body.date, checkOut: body.checkOut },
      { id: user.profile.id },
    );
  },
});
