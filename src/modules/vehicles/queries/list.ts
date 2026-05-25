import { VehicleStatus, type Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export type ListVehiclesParams = {
  q?: string;
  page?: number;
  pageSize?: number;
  branchId?: string;
};

export async function listVehicles({
  q = "",
  page = 1,
  pageSize = 20,
  branchId,
}: ListVehiclesParams) {
  const where: Prisma.VehicleWhereInput = {
    deletedAt: null,
    ...(branchId ? { branchId } : {}),
    ...(q
      ? {
          OR: [
            { registrationNumber: { contains: q, mode: "insensitive" } },
            { make: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.vehicle.findMany({
      where,
      include: { branch: { select: { id: true, name: true, code: true } } },
      orderBy: [{ status: "asc" }, { registrationNumber: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.vehicle.count({ where }),
  ]);

  return { rows, total };
}

export type ListAssignableVehiclesParams = {
  branchId: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function listAssignableVehicles({
  branchId,
  q = "",
  page = 1,
  pageSize = 20,
}: ListAssignableVehiclesParams) {
  const where: Prisma.VehicleWhereInput = {
    deletedAt: null,
    branchId,
    status: { in: [VehicleStatus.AVAILABLE, VehicleStatus.ON_TRIP] },
    ...(q
      ? {
          OR: [
            { registrationNumber: { contains: q, mode: "insensitive" } },
            { make: { contains: q, mode: "insensitive" } },
            { model: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.vehicle.findMany({
      where,
      include: { branch: { select: { id: true, name: true, code: true } } },
      orderBy: [{ status: "asc" }, { registrationNumber: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.vehicle.count({ where }),
  ]);

  return { rows, total };
}

export function getVehicle(id: string) {
  return db.vehicle.findFirst({
    where: { id, deletedAt: null },
    include: { branch: { select: { id: true, name: true } } },
  });
}
