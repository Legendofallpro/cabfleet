import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { ok, type Result } from "@/lib/result";
import { writeAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import type { BookingType } from "@prisma/client";
import type { CreateBookingTypeInput } from "@/modules/bookings/validators/booking-type";
import { tombstoneUniqueValue } from "@/lib/soft-delete";

type Actor = { id: string };

export async function createBookingType(
  input: CreateBookingTypeInput,
  actor: Actor,
): Promise<Result<BookingType>> {
  const dupe = await db.bookingType.findFirst({
    where: { name: input.name, deletedAt: null },
  });
  if (dupe) {
    throw new AppError("CONFLICT", "A booking type with this name already exists.", {
      fieldErrors: { name: ["Already in use"] },
    });
  }

  const row = await db.$transaction(async (tx) => {
    const created = await tx.bookingType.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        defaultDispatchMode: input.defaultDispatchMode,
        active: input.active,
      },
    });
    await writeAudit(tx, {
      entity: "BookingType",
      entityId: created.id,
      action: "CREATE",
      byProfileId: actor.id,
      diff: { after: created },
    });
    return created;
  });
  logger.info({ bookingTypeId: row.id, by: actor.id }, "booking_type.create");
  return ok(row);
}

export async function deleteBookingType(
  id: string,
  actor: Actor,
): Promise<Result<{ id: string }>> {
  const existing = await db.bookingType.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    throw new AppError("NOT_FOUND", "Booking type not found.");
  }

  await db.$transaction(async (tx) => {
    await tx.bookingType.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        active: false,
        name: tombstoneUniqueValue(existing.name, id),
      },
    });
    await writeAudit(tx, {
      entity: "BookingType",
      entityId: id,
      action: "DELETE",
      byProfileId: actor.id,
    });
  });
  logger.info({ bookingTypeId: id, by: actor.id }, "booking_type.delete");
  return ok({ id });
}
