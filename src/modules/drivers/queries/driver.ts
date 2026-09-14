import { DriverStatus, type Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export type ListDriversParams = {
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function listDrivers({ q = "", page = 1, pageSize = 20 }: ListDriversParams) {
  const where: Prisma.DriverWhereInput = {
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { licenseNumber: { contains: q, mode: "insensitive" } },
            { profile: { fullName: { contains: q, mode: "insensitive" } } },
            { profile: { email: { contains: q, mode: "insensitive" } } },
            { profile: { phone: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.driver.findMany({
      where,
      include: {
        profile: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            branchId: true,
            branch: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.driver.count({ where }),
  ]);

  return { rows, total };
}

export type ListAssignableDriversParams = {
  branchId: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function listAssignableDrivers({
  branchId,
  q = "",
  page = 1,
  pageSize = 20,
}: ListAssignableDriversParams) {
  const where: Prisma.DriverWhereInput = {
    deletedAt: null,
    status: { in: [DriverStatus.ACTIVE, DriverStatus.ON_LEAVE] },
    profile: { is: { branchId } },
    ...(q
      ? {
          OR: [
            { licenseNumber: { contains: q, mode: "insensitive" } },
            { profile: { fullName: { contains: q, mode: "insensitive" } } },
            { profile: { email: { contains: q, mode: "insensitive" } } },
            { profile: { phone: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.driver.findMany({
      where,
      include: {
        profile: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            branchId: true,
            branch: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.driver.count({ where }),
  ]);

  return { rows, total };
}

export function getOpenVehicleAssignment(driverId: string) {
  return db.vehicleAssignment.findFirst({
    where: { driverId, validTo: null },
    include: {
      vehicle: {
        select: { id: true, registrationNumber: true, make: true, model: true },
      },
    },
    orderBy: { validFrom: "desc" },
  });
}

export function getDriver(id: string) {
  return db.driver.findFirst({
    where: { id, deletedAt: null },
    include: {
      profile: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          branchId: true,
        },
      },
    },
  });
}
