"use client";

/**
 * Customer-facing live trip map (Phase 7 W5).
 *
 * Renders the driver's current and recent location on a MapLibre GL map
 * using vector tiles from MapTiler. Subscribes to Supabase Realtime
 * broadcast channel `trip:{bookingId}` and prepends incoming points to
 * the rendered polyline.
 *
 * Lazy-loaded by the consumer via next/dynamic({ ssr: false }) — MapLibre
 * touches `window` at module-eval time and is ~800KB; we don't want it
 * in the customer portal initial bundle.
 *
 * Visibility rules
 * ----------------
 *   - Only mounted by the parent page when (a) status is one of the
 *     in-trip statuses and (b) Booking.locationConsentAt is set.
 *   - When no points have arrived yet, we show the pickup pin and a
 *     "Waiting for driver" hint.
 */
import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as MapLibreMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { createBrowserClient } from "@supabase/ssr";

export type LiveTripPoint = {
  lat: number;
  lng: number;
  recordedAt: string;
};

type LiveTripMapProps = {
  bookingId: string;
  pickup: { lat: number; lng: number } | null;
  drop: { lat: number; lng: number } | null;
  initialPoints: LiveTripPoint[];
  /** From env (`NEXT_PUBLIC_MAP_TILES_URL`). Required to render. */
  mapTilesUrl: string | null;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

const TRACK_LINE_COLOR = "#3b82f6";

export default function LiveTripMap({
  bookingId,
  pickup,
  drop,
  initialPoints,
  mapTilesUrl,
  supabaseUrl,
  supabaseAnonKey,
}: LiveTripMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const driverMarkerRef = useRef<Marker | null>(null);
  const pointsRef = useRef<LiveTripPoint[]>(initialPoints);
  const [latest, setLatest] = useState<LiveTripPoint | null>(
    initialPoints.length > 0 ? initialPoints[initialPoints.length - 1] : null,
  );

  // Map init — runs once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (!mapTilesUrl) return;

    const initialCenter =
      latest ?? pickup ?? drop ?? { lat: 12.9716, lng: 77.5946 };

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapTilesUrl,
      center: [initialCenter.lng, initialCenter.lat],
      zoom: 13,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.on("load", () => {
      if (pickup) {
        new maplibregl.Marker({ color: "#22c55e" })
          .setLngLat([pickup.lng, pickup.lat])
          .setPopup(new maplibregl.Popup().setText("Pickup"))
          .addTo(map);
      }
      if (drop) {
        new maplibregl.Marker({ color: "#ef4444" })
          .setLngLat([drop.lng, drop.lat])
          .setPopup(new maplibregl.Popup().setText("Drop"))
          .addTo(map);
      }

      map.addSource("trip-path", {
        type: "geojson",
        data: toLineString(pointsRef.current),
      });
      map.addLayer({
        id: "trip-path",
        type: "line",
        source: "trip-path",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": TRACK_LINE_COLOR,
          "line-width": 4,
          "line-opacity": 0.85,
        },
      });

      if (latest) {
        driverMarkerRef.current = new maplibregl.Marker({ color: TRACK_LINE_COLOR })
          .setLngLat([latest.lng, latest.lat])
          .addTo(map);
      }
    });

    return () => {
      driverMarkerRef.current?.remove();
      driverMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime subscription. Updates ref + driver marker + path source.
  useEffect(() => {
    if (!supabaseUrl || !supabaseAnonKey) return;
    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
    const channel = supabase.channel(`trip:${bookingId}`, {
      config: { private: true },
    });

    void supabase.realtime.setAuth();

    channel
      .on("broadcast", { event: "location" }, ({ payload }) => {
        const incoming = payload as {
          points?: LiveTripPoint[];
        };
        const next = (incoming.points ?? []).filter(
          (p): p is LiveTripPoint =>
            typeof p?.lat === "number" && typeof p?.lng === "number",
        );
        if (next.length === 0) return;
        pointsRef.current = [...pointsRef.current, ...next];
        const newest = next[next.length - 1];
        setLatest(newest);
        const map = mapRef.current;
        if (!map) return;
        const source = map.getSource("trip-path") as
          | maplibregl.GeoJSONSource
          | undefined;
        if (source) source.setData(toLineString(pointsRef.current));
        if (driverMarkerRef.current) {
          driverMarkerRef.current.setLngLat([newest.lng, newest.lat]);
        } else if (map.loaded()) {
          driverMarkerRef.current = new maplibregl.Marker({ color: TRACK_LINE_COLOR })
            .setLngLat([newest.lng, newest.lat])
            .addTo(map);
        }
        map.easeTo({ center: [newest.lng, newest.lat], duration: 400 });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [bookingId, supabaseUrl, supabaseAnonKey]);

  if (!mapTilesUrl) {
    return (
      <div className="rounded-xl border border-default bg-surface-inset px-4 py-6 text-center text-sm text-muted">
        Live map is unavailable — map tiles are not configured.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-72 w-full overflow-hidden rounded-xl border border-default"
        aria-label="Live trip map"
      />
      {!latest && (
        <p className="text-xs text-muted">
          Waiting for your driver to start sharing their location…
        </p>
      )}
      {latest && (
        <p className="text-xs text-muted">
          Last update:{" "}
          {new Intl.DateTimeFormat("en-IN", { timeStyle: "medium" }).format(
            new Date(latest.recordedAt),
          )}
        </p>
      )}
    </div>
  );
}

function toLineString(points: LiveTripPoint[]) {
  return {
    type: "Feature" as const,
    geometry: {
      type: "LineString" as const,
      coordinates: points.map((p) => [p.lng, p.lat]),
    },
    properties: {},
  };
}
