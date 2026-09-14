import { db } from "@/lib/db";
import { BookingStatus } from "@prisma/client";
// getOrCreateCustomer performs a write — it lives in services/ not here.
export type { CustomerRow } from "@/modules/customers/services/customer.service";

/**
 * Fetches a single booking scoped to the owning customer's profileId.
 * Returns null when the booking is not found or belongs to a different profile.
 */
export async function getCustomerBooking(id: string, profileId: string) {
  const booking = await db.booking.findFirst({
    where: { id, deletedAt: null },
    include: {
      customer: { select: { profileId: true } },
      bookingType: { select: { name: true } },
      branch: { select: { name: true, code: true } },
      assignedDriver: {
        include: { profile: { select: { fullName: true, phone: true } } },
      },
      claimedBy: {
        include: { profile: { select: { fullName: true, phone: true } } },
      },
      assignedVehicle: {
        select: { registrationNumber: true, make: true, model: true },
      },
    },
  });
  if (!booking || booking.customer.profileId !== profileId) return null;
  return booking;
}

const OPEN_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.OPEN_FOR_CLAIM,
  BookingStatus.CLAIMED,
  BookingStatus.ASSIGNED,
  BookingStatus.DRIVER_EN_ROUTE,
  BookingStatus.IN_PROGRESS,
];

/** Next open trip for the customer home card (non-terminal, soonest pickup). */
export async function getActiveCustomerBooking(customerId: string) {
  return db.booking.findFirst({
    where: {
      customerId,
      deletedAt: null,
      status: { in: OPEN_STATUSES },
    },
    include: {
      bookingType: { select: { id: true, name: true } },
    },
    orderBy: { pickupAt: "asc" },
  });
}

export type CustomerBookingRow = {
  id: string;
  status: string;
  dispatchMode: string;
  pickupAt: Date;
  pickupAddress: string;
  dropAddress: string;
  passengers: number;
  fareEstimate: number | null;
  fareFinal: number | null;
  createdAt: Date;
  bookingType: { id: string; name: string };
  branch: { id: string; name: string; code: string };
};

/**
 * Returns paginated bookings for a customer with all Decimal fields
 * pre-serialized to number so callers can pass rows directly to Client Components.
 */
export async function listCustomerBookings(
  customerId: string,
  opts: { page?: number; pageSize?: number } = {},
): Promise<{ rows: CustomerBookingRow[]; total: number }> {
  const { page = 1, pageSize = 20 } = opts;
  const where = { customerId, deletedAt: null };

  const [rawRows, total] = await Promise.all([
    db.booking.findMany({
      where,
      include: {
        bookingType: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: { pickupAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.booking.count({ where }),
  ]);

  const rows: CustomerBookingRow[] = rawRows.map((b) => ({
    id: b.id,
    status: b.status,
    dispatchMode: b.dispatchMode,
    pickupAt: b.pickupAt,
    pickupAddress: b.pickupAddress,
    dropAddress: b.dropAddress,
    passengers: b.passengers,
    fareEstimate: b.fareEstimate != null ? Number(b.fareEstimate) : null,
    fareFinal: b.fareFinal != null ? Number(b.fareFinal) : null,
    createdAt: b.createdAt,
    bookingType: b.bookingType,
    branch: b.branch,
  }));

  return { rows, total };
}
