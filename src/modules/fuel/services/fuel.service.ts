import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";
import type { FuelLog } from "@prisma/client";
import type { FuelLogInput } from "@/modules/fuel/validators/fuel";

type Actor = { id: string };

/**
 * Creates a fuel log record for a vehicle.
 * Writes an AuditLog row inside the same transaction.
 */
export async function createFuelLog(
  input: FuelLogInput,
  actor: Actor,
): Promise<Result<FuelLog>> {
  const vehicle = await db.vehicle.findFirst({
    where: { id: input.vehicleId, deletedAt: null },
    select: { id: true },
  });
  if (!vehicle) throw new AppError("NOT_FOUND", "Vehicle not found.");

  if (input.driverId) {
    const driver = await db.driver.findFirst({
      where: { id: input.driverId, deletedAt: null },
      select: { id: true },
    });
    if (!driver) throw new AppError("NOT_FOUND", "Driver not found.");
  }

  const record = await db.$transaction(async (tx) => {
    const created = await tx.fuelLog.create({
      data: {
        vehicleId: input.vehicleId,
        driverId: input.driverId ?? null,
        litres: input.litres,
        amount: input.amount,
        odometer: input.odometer,
        notes: input.notes ?? null,
        at: input.at ?? new Date(),
      },
    });

    await writeAudit(tx, {
      entity: "FuelLog",
      entityId: created.id,
      action: "CREATE",
      byProfileId: actor.id,
      diff: {
        after: {
          ...created,
          litres: Number(created.litres),
          amount: Number(created.amount),
        },
      },
    });

    return created;
  });

  logger.info(
    { fuelLogId: record.id, vehicleId: input.vehicleId, by: actor.id },
    "fuelLog.created",
  );

  return ok(record);
}
