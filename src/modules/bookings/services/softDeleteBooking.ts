import { db } from "@/lib/db";
import { err, ok, type Result } from "@/lib/result";
import { writeAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";

export async function softDeleteBooking(
  bookingId: string,
  actor: { id: string },
): Promise<Result<true>> {
  const current = await db.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
  });
  if (!current) {
    return err({ code: "NOT_FOUND", message: "Booking not found." });
  }

  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { deletedAt: new Date() },
    });
    await writeAudit(tx, {
      entity: "Booking",
      entityId: bookingId,
      action: "DELETE",
      byProfileId: actor.id,
    });
  });

  logger.info({ bookingId, actor: actor.id }, "booking.softDeleted");

  return ok(true as const);
}
