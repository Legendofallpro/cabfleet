import { db } from "@/lib/db";

export async function listBookingTypesAdmin() {
  return db.bookingType.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
}
