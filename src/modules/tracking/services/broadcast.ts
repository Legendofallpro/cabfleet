/**
 * Supabase Realtime broadcast for live trip locations (Phase 7 W5).
 *
 * Server-side publish only. The customer's LiveTripMap subscribes to
 * the same channel via the public anon key.
 *
 * Channel naming
 * --------------
 * One channel per booking: `trip:{bookingId}`. The booking id is a 25-char
 * cuid that's already capability-style — only customers who can see the
 * booking detail page (RLS-protected) know it, and the driver who's
 * assigned to it. A leaked channel name lets a third party observe live
 * coordinates of a specific trip; no PII, no other trips. Documented as
 * a known trade-off; production upgrade path is Supabase "private"
 * channels (require an authorised JWT) once the customer mobile app
 * ships.
 *
 * Failure mode
 * ------------
 * The broadcast is FIRE-AND-FORGET on best effort. If the Realtime
 * service is down we still write the row to TripLocation — the customer
 * map will catch up on the next reconnect / poll. We log failures but
 * never throw upward; the ingest path is the source of truth.
 */
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export type BroadcastPoint = {
  lat: number;
  lng: number;
  recordedAt: string;
  flagged: boolean;
};

export type BroadcastPayload = {
  bookingId: string;
  driverId: string | null;
  points: BroadcastPoint[];
};

export function tripChannelName(bookingId: string): string {
  return `trip:${bookingId}`;
}

export async function broadcastLocations(payload: BroadcastPayload): Promise<void> {
  try {
    const client = getSupabaseAdminClient();
    const channel = client.channel(tripChannelName(payload.bookingId));
    // Subscribe is required before send on the server SDK. We tear down
    // immediately afterwards — keeping channels open isn't useful when
    // the next emit arrives via a fresh HTTP request.
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("realtime.subscribe_timeout")),
        2_000,
      );
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timer);
          resolve();
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timer);
          reject(new Error(`realtime.subscribe_${status}`));
        }
      });
    });
    await channel.send({
      type: "broadcast",
      event: "location",
      payload,
    });
    await client.removeChannel(channel);
  } catch (err) {
    logger.warn(
      {
        err: err instanceof Error ? err.message : String(err),
        bookingId: payload.bookingId,
      },
      "tracking.broadcast.failed",
    );
  }
}
