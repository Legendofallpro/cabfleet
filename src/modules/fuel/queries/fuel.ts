import { db } from "@/lib/db";

export interface ListFuelLogsOpts {
  vehicleId?: string;
  driverId?: string;
  from?: Date;
  to?: Date;
  pageSize?: number;
  page?: number;
}

const fuelLogSelect = {
  id: true,
  vehicleId: true,
  driverId: true,
  litres: true,
  amount: true,
  odometer: true,
  notes: true,
  at: true,
  createdAt: true,
  vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } },
  driver: {
    select: {
      id: true,
      profile: { select: { fullName: true, email: true } },
    },
  },
} as const;

export type FuelLogRow = Awaited<ReturnType<typeof listFuelLogs>>["rows"][number];

export async function listFuelLogs(opts: ListFuelLogsOpts = {}) {
  const pageSize = opts.pageSize ?? 30;
  const page = opts.page ?? 1;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(opts.vehicleId ? { vehicleId: opts.vehicleId } : {}),
    ...(opts.driverId ? { driverId: opts.driverId } : {}),
    ...(opts.from || opts.to
      ? {
          at: {
            ...(opts.from ? { gte: opts.from } : {}),
            ...(opts.to ? { lte: opts.to } : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await db.$transaction([
    db.fuelLog.findMany({
      where,
      orderBy: { at: "desc" },
      skip,
      take: pageSize,
      select: fuelLogSelect,
    }),
    db.fuelLog.count({ where }),
  ]);

  return { rows, total };
}
