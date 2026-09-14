"use client";

import { useEffect, useRef } from "react";
import { recordLocationAction } from "@/modules/tracking/actions/tracking.actions";

const MIN_INTERVAL_MS = 5_000;

/**
 * Publishes the driver's browser GPS to the same ingest path as REST
 * `/api/v1/trips/:id/location`. Renders nothing. Stops when `enabled` is false.
 */
export function DriverLocationPublisher({
  bookingId,
  enabled,
}: {
  bookingId: string;
  enabled: boolean;
}) {
  const lastSentAt = useRef(0);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSentAt.current < MIN_INTERVAL_MS) return;
        lastSentAt.current = now;
        const speedMs = pos.coords.speed;
        void recordLocationAction({
          bookingId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speedKph:
            speedMs != null && speedMs >= 0 ? speedMs * 3.6 : undefined,
          recordedAt: new Date(pos.timestamp),
        });
      },
      () => {
        // Permission denied / timeout — stay silent; the trip still works.
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [bookingId, enabled]);

  return null;
}
