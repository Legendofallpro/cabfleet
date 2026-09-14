/**
 * Supabase Realtime broadcast for live trip locations (Phase 7 W5).
 *
 * Server-side publish only, on a **private** channel. The customer's
 * LiveTripMap subscribes with an authenticated JWT. Channel authorization
 * is `prisma/sql/15_realtime_private_trip.sql` (customer owns the booking
 * OR assigned/claimed driver). Keep `REALTIME_TRACKING_ENABLED` false until
 * that SQL and the Realtime authorization toggle are applied.
 *
 * Channel naming: `trip:{bookingId}`.
 *
 * Failure mode: fire-and-forget. TripLocation rows remain the source of truth.
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
  points: BroadcastPoint[];
};

export function tripChannelName(bookingId: string): string {
  return `trip:${bookingId}`;
}

export async function broadcastLocations(payload: BroadcastPayload): Promise<void> {
  try {
    const client = getSupabaseAdminClient();
    const channel = client.channel(tripChannelName(payload.bookingId), {
      config: { private: true },
    });
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
