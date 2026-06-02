/**
 * Read-only queries for trip locations (Phase 7 W5).
 * Safe to call from RSCs.
 */
import { db } from "@/lib/db";

/** Most recent N non-flagged points for a booking, ascending by recordedAt. */
export async function listRecentForBooking(bookingId: string, limit = 200) {
  // Pull in descending order (uses the index) then reverse.
  const rows = await db.tripLocation.findMany({
    where: { bookingId, flagged: false },
    orderBy: { recordedAt: "desc" },
    take: limit,
    select: { lat: true, lng: true, recordedAt: true },
  });
  return rows.reverse().map((r) => ({
    lat: Number(r.lat),
    lng: Number(r.lng),
    recordedAt: r.recordedAt,
  }));
}

/** Latest accepted point — used by the live map's initial render. */
export async function getLatestPoint(bookingId: string) {
  const row = await db.tripLocation.findFirst({
    where: { bookingId, flagged: false },
    orderBy: { recordedAt: "desc" },
    select: { lat: true, lng: true, recordedAt: true },
  });
  if (!row) return null;
  return {
    lat: Number(row.lat),
    lng: Number(row.lng),
    recordedAt: row.recordedAt,
  };
}
