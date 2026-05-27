import { db } from "@/lib/db";

export interface ListMaintenanceLogsOpts {
  vehicleId?: string;
  from?: Date;
  to?: Date;
  type?: string;
  pageSize?: number;
  page?: number;
}

const maintenanceLogSelect = {
  id: true,
  vehicleId: true,
  type: true,
  cost: true,
  odometer: true,
  nextDueOdometer: true,
  notes: true,
  at: true,
  createdAt: true,
  vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } },
} as const;

export type MaintenanceLogRow = Awaited<
  ReturnType<typeof listMaintenanceLogs>
>["rows"][number];

export async function listMaintenanceLogs(opts: ListMaintenanceLogsOpts = {}) {
  const pageSize = opts.pageSize ?? 30;
  const page = opts.page ?? 1;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(opts.vehicleId ? { vehicleId: opts.vehicleId } : {}),
    ...(opts.type ? { type: opts.type } : {}),
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
    db.maintenanceLog.findMany({
      where,
      orderBy: { at: "desc" },
      skip,
      take: pageSize,
      select: maintenanceLogSelect,
    }),
    db.maintenanceLog.count({ where }),
  ]);

  return { rows, total };
}
