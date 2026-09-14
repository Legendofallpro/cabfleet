/**
 * Read-only queries used by the driver portal.
 * Safe to call from React Server Components.
 */
import { BookingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import {
  bookingDetailInclude,
  openClaimBookingInclude,
} from "@/modules/bookings/includes";
import type { BookingDetail } from "@/modules/bookings/types";

const myTripListInclude = {
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

const openClaimListInclude = {
  branch: { select: { id: true, code: true, name: true } },
  bookingType: { select: { id: true, name: true } },
  customer: {
    include: {
      profile: { select: { id: true, fullName: true } },
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
 * Customer PII is name-only until the driver claims or is assigned.
 */
export async function listOpenForClaimBookings(branchId: string) {
  return db.booking.findMany({
    where: {
      status: BookingStatus.OPEN_FOR_CLAIM,
      branchId,
      deletedAt: null,
    },
    include: openClaimListInclude,
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
    include: myTripListInclude,
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
  const head = await db.booking.findFirst({
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
    select: {
      id: true,
      status: true,
      claimedByDriverId: true,
      assignedDriverId: true,
    },
  });
  if (!head) return null;

  const owned =
    head.claimedByDriverId === access.driverId ||
    head.assignedDriverId === access.driverId;

  const booking = await db.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    include: owned ? bookingDetailInclude : openClaimBookingInclude,
  });
  return booking as BookingDetail | null;
}
