import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { writeAudit } from "@/lib/audit";
import { ok, type Result } from "@/lib/result";
import type { Vehicle } from "@prisma/client";
import type { VehicleInput } from "@/modules/vehicles/validators/vehicle";

type Actor = { id: string };

async function assertBranch(branchId: string) {
  const branch = await db.branch.findFirst({
    where: { id: branchId, deletedAt: null },
  });
  if (!branch) throw new AppError("VALIDATION", "Branch is invalid", {
    fieldErrors: { branchId: ["Branch not found or inactive"] },
  });
}

export async function createVehicle(
  input: VehicleInput,
  actor: Actor,
): Promise<Result<Vehicle>> {
  await assertBranch(input.branchId);

  const dupe = await db.vehicle.findUnique({
    where: { registrationNumber: input.registrationNumber },
  });
  if (dupe) {
    throw new AppError("CONFLICT", "Vehicle with this registration already exists.", {
      fieldErrors: { registrationNumber: ["Already in use"] },
    });
  }

  const vehicle = await db.$transaction(async (tx) => {
    const created = await tx.vehicle.create({ data: input });
    await writeAudit(tx, {
      entity: "Vehicle",
      entityId: created.id,
      action: "CREATE",
      byProfileId: actor.id,
      diff: { after: created },
    });
    return created;
  });

  return ok(vehicle);
}

export async function updateVehicle(
  id: string,
  input: VehicleInput,
  actor: Actor,
): Promise<Result<Vehicle>> {
  const current = await db.vehicle.findFirst({
    where: { id, deletedAt: null },
  });
  if (!current) throw new AppError("NOT_FOUND", "Vehicle not found.");

  if (input.branchId !== current.branchId) await assertBranch(input.branchId);

  if (input.registrationNumber !== current.registrationNumber) {
    const dupe = await db.vehicle.findUnique({
      where: { registrationNumber: input.registrationNumber },
    });
    if (dupe) {
      throw new AppError("CONFLICT", "Vehicle with this registration already exists.", {
        fieldErrors: { registrationNumber: ["Already in use"] },
      });
    }
  }

  const vehicle = await db.$transaction(async (tx) => {
    const updated = await tx.vehicle.update({ where: { id }, data: input });
    const action =
      current.status !== updated.status ? "STATUS_CHANGE" : "UPDATE";
    await writeAudit(tx, {
      entity: "Vehicle",
      entityId: id,
      action,
      byProfileId: actor.id,
      diff: { before: current, after: updated },
    });
    return updated;
  });

  return ok(vehicle);
}

export async function softDeleteVehicle(id: string, actor: Actor): Promise<Result<true>> {
  const current = await db.vehicle.findFirst({
    where: { id, deletedAt: null },
  });
  if (!current) throw new AppError("NOT_FOUND", "Vehicle not found.");

  await db.$transaction(async (tx) => {
    await tx.vehicle.update({
      where: { id },
      data: { deletedAt: new Date(), status: "INACTIVE" },
    });
    await writeAudit(tx, {
      entity: "Vehicle",
      entityId: id,
      action: "DELETE",
      byProfileId: actor.id,
    });
  });

  return ok(true);
}
