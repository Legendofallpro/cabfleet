import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { ok, type Result } from "@/lib/result";
import { writeAudit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import type { AssignVehicleInput } from "@/modules/drivers/validators/vehicle-assignment";

type Actor = { id: string };

export async function assignVehicleToDriver(
  input: AssignVehicleInput,
  actor: Actor,
): Promise<Result<{ id: string }>> {
  const driver = await db.driver.findFirst({
    where: { id: input.driverId, deletedAt: null },
    include: { profile: { select: { branchId: true } } },
  });
  if (!driver) {
    throw new AppError("NOT_FOUND", "Driver not found.");
  }

  const vehicle = await db.vehicle.findFirst({
    where: { id: input.vehicleId, deletedAt: null },
  });
  if (!vehicle) {
    throw new AppError("VALIDATION", "Vehicle not found.", {
      fieldErrors: { vehicleId: ["Vehicle not found"] },
    });
  }
  if (driver.profile.branchId && vehicle.branchId !== driver.profile.branchId) {
    throw new AppError("VALIDATION", "Vehicle must belong to the driver’s branch.", {
      fieldErrors: { vehicleId: ["Wrong branch"] },
    });
  }

  const row = await db.$transaction(async (tx) => {
    await tx.vehicleAssignment.updateMany({
      where: { driverId: input.driverId, validTo: null },
      data: { validTo: new Date() },
    });
    const created = await tx.vehicleAssignment.create({
      data: {
        driverId: input.driverId,
        vehicleId: input.vehicleId,
        validFrom: new Date(),
      },
    });
    await writeAudit(tx, {
      entity: "VehicleAssignment",
      entityId: created.id,
      action: "ASSIGN",
      byProfileId: actor.id,
      diff: { after: { driverId: input.driverId, vehicleId: input.vehicleId } },
    });
    return created;
  });

  logger.info({ assignmentId: row.id, by: actor.id }, "vehicle_assignment.create");
  return ok({ id: row.id });
}

export async function endVehicleAssignment(
  assignmentId: string,
  actor: Actor,
): Promise<Result<{ id: string }>> {
  await db.$transaction(async (tx) => {
    await tx.vehicleAssignment.update({
      where: { id: assignmentId },
      data: { validTo: new Date() },
    });
    await writeAudit(tx, {
      entity: "VehicleAssignment",
      entityId: assignmentId,
      action: "UNASSIGN",
      byProfileId: actor.id,
    });
  });
  logger.info({ assignmentId, by: actor.id }, "vehicle_assignment.end");
  return ok({ id: assignmentId });
}
