import { type BookingStatus, type Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { bookingDetailInclude } from "@/modules/bookings/services/transitionBookingStatus";
import type { BookingDetail, BookingListRow } from "@/modules/bookings/types";

export type ListBookingsParams = {
  q?: string;
  page?: number;
  pageSize?: number;
  status?: BookingStatus | "";
  branchId?: string;
};

const listInclude = {
  branch: { select: { id: true, code: true } },
  customer: {
    include: {
      profile: { select: { id: true, fullName: true, email: true } },
    },
  },
  bookingType: { select: { id: true, name: true } },
  assignedDriver: {
    include: { profile: { select: { id: true, fullName: true } } },
  },
} as const;

export async function listBookings({
  q = "",
  page = 1,
  pageSize = 20,
  status,
  branchId,
}: ListBookingsParams) {
  const where: Prisma.BookingWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(branchId ? { branchId } : {}),
    ...(q
      ? {
          OR: [
            { pickupAddress: { contains: q, mode: "insensitive" } },
            { dropAddress: { contains: q, mode: "insensitive" } },
            { customer: { profile: { fullName: { contains: q, mode: "insensitive" } } } },
            { customer: { profile: { email: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.booking.findMany({
      where,
      include: listInclude,
      orderBy: [{ pickupAt: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.booking.count({ where }),
  ]);

  return { rows: rows as unknown as BookingListRow[], total };
}

export async function getBooking(id: string): Promise<BookingDetail | null> {
  const booking = await db.booking.findFirst({
    where: { id, deletedAt: null },
    include: bookingDetailInclude,
  });
  return booking as BookingDetail | null;
}

/** Lightweight query for the booking-type select on the create form */
export async function listBookingTypes() {
  return db.bookingType.findMany({
    where: { deletedAt: null, active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, defaultDispatchMode: true },
  });
}
