/**
 * Read-only queries used by the driver portal.
 * Safe to call from React Server Components.
 */
import { BookingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { bookingDetailInclude } from "@/modules/bookings/includes";
import type { BookingDetail } from "@/modules/bookings/types";

const driverListInclude = {
  branch: { select: { id: true, code: true, name: true } },
  bookingType: { select: { id: true, name: true } },
  customer: {
    include: {
      profile: { select: { id: true, fullName: true, phone: true } },
    },
  },
  assignedDriver: {
    include: { profile: { select: { id: true, fullName: true } } },
  },
  claimedBy: {
    include: { profile: { select: { id: true, fullName: true } } },
  },
} as const;

/**
 * Bookings currently OPEN_FOR_CLAIM — scoped to the driver's branch.
 * Only drivers whose branch matches the booking's branch may see (and claim) them.
 */
export async function listOpenForClaimBookings(branchId: string) {
  return db.booking.findMany({
    where: {
      status: BookingStatus.OPEN_FOR_CLAIM,
      branchId,
      deletedAt: null,
    },
    include: driverListInclude,
    orderBy: { pickupAt: "asc" },
    take: 50,
  });
}

/**
 * Trips owned by a specific driver: CLAIMED, ASSIGNED, DRIVER_EN_ROUTE,
 * IN_PROGRESS, COMPLETED, NO_SHOW, CANCELLED (after claim).
 */
export async function listMyTrips(driverId: string) {
  return db.booking.findMany({
    where: {
      deletedAt: null,
      OR: [
        { claimedByDriverId: driverId },
        { assignedDriverId: driverId },
      ],
    },
    include: driverListInclude,
    orderBy: [{ pickupAt: "desc" }],
    take: 100,
  });
}

type DriverBookingDetailAccess = {
  driverId: string;
  branchId: string;
};

/** Full booking detail for the driver trip-detail page. */
export async function getDriverBookingDetail(
  bookingId: string,
  access: DriverBookingDetailAccess,
): Promise<BookingDetail | null> {
  const booking = await db.booking.findFirst({
    where: {
      id: bookingId,
      deletedAt: null,
      OR: [
        {
          status: BookingStatus.OPEN_FOR_CLAIM,
          branchId: access.branchId,
        },
        { claimedByDriverId: access.driverId },
        { assignedDriverId: access.driverId },
      ],
    },
    include: bookingDetailInclude,
  });
  return booking as BookingDetail | null;
}
