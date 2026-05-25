import { db } from "@/lib/db";

export type CustomerRow = {
  id: string;
  profileId: string;
  loyaltyTier: string | null;
  totalBookings: number;
  totalSpend: number;
  createdAt: Date;
};

/**
 * Returns the Customer extension record for a Profile, or creates it lazily.
 * Handles customers who signed up before Phase 3 (no Customer row yet).
 */
export async function getOrCreateCustomer(profileId: string): Promise<CustomerRow> {
  const existing = await db.customer.findFirst({
    where: { profileId, deletedAt: null },
    select: {
      id: true,
      profileId: true,
      loyaltyTier: true,
      totalBookings: true,
      totalSpend: true,
      createdAt: true,
    },
  });

  if (existing) {
    return { ...existing, totalSpend: Number(existing.totalSpend) };
  }

  const created = await db.customer.create({
    data: { profileId },
    select: {
      id: true,
      profileId: true,
      loyaltyTier: true,
      totalBookings: true,
      totalSpend: true,
      createdAt: true,
    },
  });

  return { ...created, totalSpend: Number(created.totalSpend) };
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
