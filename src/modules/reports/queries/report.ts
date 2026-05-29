import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export type ReportPeriod = "day" | "week" | "month";

export interface ReportRangeOpts {
  from: Date;
  to: Date;
  period?: ReportPeriod;
}

// ---------------------------------------------------------------------------
// Revenue by period (sum of CAPTURED payments grouped by truncated date)
// ---------------------------------------------------------------------------

export interface RevenuePeriodRow {
  period: string;
  total: number;
  count: number;
}

export async function revenueByPeriod(opts: ReportRangeOpts): Promise<RevenuePeriodRow[]> {
  const trunc = opts.period === "month" ? "month" : opts.period === "week" ? "week" : "day";

  const rows = await db.$queryRaw<{ period: Date; total: Prisma.Decimal; count: bigint }[]>`
    SELECT
      date_trunc(${trunc}, p."capturedAt") AS "period",
      SUM(p."amount")                       AS "total",
      COUNT(*)                              AS "count"
    FROM "Payment" p
    WHERE p.status = 'CAPTURED'
      AND p."capturedAt" >= ${opts.from}
      AND p."capturedAt" <= ${opts.to}
      AND p."deletedAt" IS NULL
    GROUP BY 1
    ORDER BY 1 ASC
  `;

  return rows.map((r) => ({
    period: r.period.toISOString().slice(0, 10),
    total: Number(r.total),
    count: Number(r.count),
  }));
}

// ---------------------------------------------------------------------------
// Trips by status (count of bookings grouped by status)
// ---------------------------------------------------------------------------

export interface TripsByStatusRow {
  status: string;
  count: number;
}

export async function tripsByStatus(opts: { from: Date; to: Date }): Promise<TripsByStatusRow[]> {
  const rows = await db.booking.groupBy({
    by: ["status"],
    where: {
      deletedAt: null,
      createdAt: { gte: opts.from, lte: opts.to },
    },
    _count: { _all: true },
    orderBy: { _count: { status: "desc" } },
  });

  return rows.map((r) => ({ status: r.status, count: r._count._all }));
}

// ---------------------------------------------------------------------------
// Driver utilisation (total completed trips per driver in range)
// ---------------------------------------------------------------------------

export interface DriverUtilisationRow {
  driverId: string;
  driverName: string;
  completedTrips: number;
}

export async function driverUtilization(opts: {
  from: Date;
  to: Date;
  limit?: number;
}): Promise<DriverUtilisationRow[]> {
  const rows = await db.booking.groupBy({
    by: ["assignedDriverId"],
    where: {
      deletedAt: null,
      status: "COMPLETED",
      updatedAt: { gte: opts.from, lte: opts.to },
      assignedDriverId: { not: null },
    },
    _count: { _all: true },
    orderBy: { _count: { assignedDriverId: "desc" } },
    take: opts.limit ?? 20,
  });

  if (rows.length === 0) return [];

  const driverIds = rows
    .map((r) => r.assignedDriverId)
    .filter((id): id is string => id !== null);

  const drivers = await db.driver.findMany({
    where: { id: { in: driverIds }, deletedAt: null },
    select: {
      id: true,
      profile: { select: { fullName: true, email: true } },
    },
  });

  const driverMap = new Map(drivers.map((d) => [d.id, d]));

  return rows
    .filter((r) => r.assignedDriverId !== null)
    .map((r) => {
      const driver = driverMap.get(r.assignedDriverId!);
      return {
        driverId: r.assignedDriverId!,
        driverName: driver?.profile.fullName ?? driver?.profile.email ?? r.assignedDriverId!,
        completedTrips: r._count._all,
      };
    });
}

// ---------------------------------------------------------------------------
// Vehicle utilisation (total trips per vehicle in range)
// ---------------------------------------------------------------------------

export interface VehicleUtilisationRow {
  vehicleId: string;
  registrationNumber: string;
  totalTrips: number;
}

export async function vehicleUtilization(opts: {
  from: Date;
  to: Date;
  limit?: number;
}): Promise<VehicleUtilisationRow[]> {
  const rows = await db.booking.groupBy({
    by: ["assignedVehicleId"],
    where: {
      deletedAt: null,
      status: "COMPLETED",
      updatedAt: { gte: opts.from, lte: opts.to },
      assignedVehicleId: { not: null },
    },
    _count: { _all: true },
    orderBy: { _count: { assignedVehicleId: "desc" } },
    take: opts.limit ?? 20,
  });

  if (rows.length === 0) return [];

  const vehicleIds = rows
    .map((r) => r.assignedVehicleId)
    .filter((id): id is string => id !== null);

  const vehicles = await db.vehicle.findMany({
    where: { id: { in: vehicleIds }, deletedAt: null },
    select: { id: true, registrationNumber: true },
  });

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

  return rows
    .filter((r) => r.assignedVehicleId !== null)
    .map((r) => {
      const vehicle = vehicleMap.get(r.assignedVehicleId!);
      return {
        vehicleId: r.assignedVehicleId!,
        registrationNumber: vehicle?.registrationNumber ?? r.assignedVehicleId!,
        totalTrips: r._count._all,
      };
    });
}

// ---------------------------------------------------------------------------
// Top customers by spend (sum of CAPTURED payments per customer)
// ---------------------------------------------------------------------------

export interface TopCustomerRow {
  customerId: string;
  customerName: string;
  totalSpend: number;
  bookingCount: number;
}

export async function topCustomersBySpend(opts: {
  from: Date;
  to: Date;
  limit?: number;
}): Promise<TopCustomerRow[]> {
  const rows = await db.$queryRaw<
    { customerId: string; totalSpend: Prisma.Decimal; bookingCount: bigint }[]
  >`
    SELECT
      b."customerId",
      SUM(p."amount") AS "totalSpend",
      COUNT(DISTINCT b.id) AS "bookingCount"
    FROM "Payment" p
    JOIN "Booking" b ON b.id = p."bookingId"
    WHERE p.status = 'CAPTURED'
      AND p."capturedAt" >= ${opts.from}
      AND p."capturedAt" <= ${opts.to}
      AND p."deletedAt" IS NULL
      AND b."deletedAt" IS NULL
    GROUP BY b."customerId"
    ORDER BY "totalSpend" DESC
    LIMIT ${opts.limit ?? 10}
  `;

  if (rows.length === 0) return [];

  const customerIds = rows.map((r) => r.customerId);
  const customers = await db.customer.findMany({
    where: { id: { in: customerIds }, deletedAt: null },
    select: {
      id: true,
      profile: { select: { fullName: true, email: true } },
    },
  });
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  return rows.map((r) => {
    const customer = customerMap.get(r.customerId);
    return {
      customerId: r.customerId,
      customerName:
        customer?.profile.fullName ?? customer?.profile.email ?? r.customerId,
      totalSpend: Number(r.totalSpend),
      bookingCount: Number(r.bookingCount),
    };
  });
}
