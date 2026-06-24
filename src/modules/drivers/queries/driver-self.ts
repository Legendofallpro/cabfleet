/**
 * Read-only queries for the driver's own overview page.
 * Safe to call from React Server Components.
 */
import { BookingStatus } from "@prisma/client";
import { db } from "@/lib/db";

const ACTIVE_STATUSES: BookingStatus[] = [
  BookingStatus.CLAIMED,
  BookingStatus.ASSIGNED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.IN_PROGRESS,
];

export type DriverSelfOverview = Awaited<ReturnType<typeof getDriverSelfOverview>>;

export async function getDriverSelfOverview(driverId: string, profileId: string) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const [
    driver,
    vehicleAssignment,
    activeTrip,
    recentCompleted,
    todayAgg,
    weekAgg,
    todayAttendance,
  ] = await Promise.all([
    // Driver core row
    db.driver.findFirst({
      where: { id: driverId, deletedAt: null },
      select: {
        id: true,
        licenseNumber: true,
        licenseExpiry: true,
        status: true,
        verification: true,
        rating: true,
        totalTrips: true,
        createdAt: true,
        profile: {
          select: {
            fullName: true,
            avatarUrl: true,
            branch: { select: { name: true } },
          },
        },
      },
    }),

    // Current active vehicle assignment (no validTo or validTo in the future)
    db.vehicleAssignment.findFirst({
      where: {
        driverId,
        OR: [{ validTo: null }, { validTo: { gte: now } }],
      },
      orderBy: { validFrom: "desc" },
      select: {
        id: true,
        validFrom: true,
        validTo: true,
        vehicle: {
          select: {
            id: true,
            registrationNumber: true,
            make: true,
            model: true,
            year: true,
            color: true,
            type: true,
            odometer: true,
            insuranceExpiry: true,
            fitnessExpiry: true,
            pucExpiry: true,
          },
        },
      },
    }),

    // Active trip (only one expected at a time)
    db.booking.findFirst({
      where: {
        deletedAt: null,
        status: { in: ACTIVE_STATUSES },
        OR: [{ claimedByDriverId: driverId }, { assignedDriverId: driverId }],
      },
      select: {
        id: true,
        status: true,
        pickupAddress: true,
        dropAddress: true,
        pickupAt: true,
        fareEstimate: true,
        fareFinal: true,
        passengers: true,
        bookingType: { select: { name: true } },
      },
      orderBy: { pickupAt: "asc" },
    }),

    // Last 3 completed trips
    db.booking.findMany({
      where: {
        deletedAt: null,
        status: BookingStatus.COMPLETED,
        OR: [{ claimedByDriverId: driverId }, { assignedDriverId: driverId }],
      },
      select: {
        id: true,
        pickupAddress: true,
        dropAddress: true,
        pickupAt: true,
        fareFinal: true,
      },
      orderBy: { pickupAt: "desc" },
      take: 3,
    }),

    // Today's completed trip count + fare total
    db.booking.aggregate({
      where: {
        deletedAt: null,
        status: BookingStatus.COMPLETED,
        OR: [{ claimedByDriverId: driverId }, { assignedDriverId: driverId }],
        pickupAt: { gte: todayStart },
      },
      _count: { id: true },
      _sum: { fareFinal: true },
    }),

    // This week's completed trip count + fare total (rolling 7 days)
    db.booking.aggregate({
      where: {
        deletedAt: null,
        status: BookingStatus.COMPLETED,
        OR: [{ claimedByDriverId: driverId }, { assignedDriverId: driverId }],
        pickupAt: { gte: weekStart },
      },
      _count: { id: true },
      _sum: { fareFinal: true },
    }),

    // Today's attendance record
    db.attendance.findUnique({
      where: { profileId_date: { profileId, date: todayStart } },
      select: {
        status: true,
        checkIn: true,
        checkOut: true,
      },
    }),
  ]);

  return {
    driver,
    vehicleAssignment,
    activeTrip,
    recentCompleted,
    today: {
      count: todayAgg._count.id,
      earnings: Number(todayAgg._sum.fareFinal ?? 0),
    },
    week: {
      count: weekAgg._count.id,
      earnings: Number(weekAgg._sum.fareFinal ?? 0),
    },
    todayAttendance,
  };
}

/** Lighter query for the Profile page driver-stats card. */
export async function getDriverCard(profileId: string) {
  return db.driver.findFirst({
    where: { profileId, deletedAt: null },
    select: {
      id: true,
      licenseNumber: true,
      licenseExpiry: true,
      status: true,
      verification: true,
      rating: true,
      totalTrips: true,
      createdAt: true,
    },
  });
}
