import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { rawSqlOrgId } from "@/lib/org-context";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getTodayBookingCount(): Promise<number> {
  return db.booking.count({
    where: { deletedAt: null, createdAt: { gte: startOfToday() } },
  });
}

export async function getActiveRidesCount(): Promise<number> {
  return db.booking.count({
    where: {
      deletedAt: null,
      status: { in: ["ASSIGNED", "DRIVER_EN_ROUTE", "IN_PROGRESS"] },
    },
  });
}

export async function getAvailableVehicleCount(): Promise<number> {
  return db.vehicle.count({
    where: { deletedAt: null, status: "AVAILABLE" },
  });
}

export async function getTodayRevenue(): Promise<number> {
  const orgId = await rawSqlOrgId();
  const result = await db.$queryRaw<{ total: Prisma.Decimal | null }[]>`
    SELECT SUM(amount) AS total
    FROM "Payment"
    WHERE status = 'CAPTURED'
      AND "capturedAt" >= ${startOfToday()}
      AND "deletedAt" IS NULL
      AND (${orgId}::text IS NULL OR "orgId" = ${orgId})
  `;
  return Number(result[0]?.total ?? 0);
}

export async function getActiveDriverCount(): Promise<number> {
  return db.driver.count({
    where: { deletedAt: null, status: "ACTIVE" },
  });
}

export async function getPendingPaymentCount(): Promise<number> {
  return db.payment.count({
    where: { deletedAt: null, status: "PENDING" },
  });
}

const recentBookingSelect = {
  id: true,
  status: true,
  pickupAt: true,
  pickupAddress: true,
  customer: {
    select: {
      profile: { select: { fullName: true, email: true } },
    },
  },
} as const;

export type RecentBookingRow = Awaited<ReturnType<typeof getRecentBookings>>[number];

export async function getRecentBookings(limit = 8): Promise<typeof rows> {
  const rows = await db.booking.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: recentBookingSelect,
  });
  return rows;
}
