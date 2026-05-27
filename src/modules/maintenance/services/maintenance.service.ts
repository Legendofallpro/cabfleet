import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { ok, type Result } from "@/lib/result";
import { logger } from "@/lib/logger";
import type { MaintenanceLog } from "@prisma/client";
import type { MaintenanceLogInput } from "@/modules/maintenance/validators/maintenance";

type Actor = { id: string };

/**
 * Creates a maintenance log entry for a vehicle.
 * Writes an AuditLog row inside the same transaction.
 */
export async function createMaintenanceLog(
  input: MaintenanceLogInput,
  actor: Actor,
): Promise<Result<MaintenanceLog>> {
  const vehicle = await db.vehicle.findFirst({
    where: { id: input.vehicleId, deletedAt: null },
    select: { id: true },
  });
  if (!vehicle) throw new AppError("NOT_FOUND", "Vehicle not found.");

  const record = await db.$transaction(async (tx) => {
    const created = await tx.maintenanceLog.create({
      data: {
        vehicleId: input.vehicleId,
        type: input.type,
        cost: input.cost,
        odometer: input.odometer,
        nextDueOdometer: input.nextDueOdometer ?? null,
        notes: input.notes ?? null,
        at: input.at ?? new Date(),
      },
    });

    await writeAudit(tx, {
      entity: "MaintenanceLog",
      entityId: created.id,
      action: "CREATE",
      byProfileId: actor.id,
      diff: { after: { ...created, cost: Number(created.cost) } },
    });

    return created;
  });

  logger.info(
    { maintenanceLogId: record.id, vehicleId: input.vehicleId, type: input.type, by: actor.id },
    "maintenanceLog.created",
  );

  return ok(record);
}
