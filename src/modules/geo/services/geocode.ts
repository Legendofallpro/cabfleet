/**
 * Server-side geocoding + driving distance (Wave C).
 *
 * Typed addresses stay as the booking UX. When MAPBOX_ACCESS_TOKEN is set we
 * fill Booking.pickupLat/Lng / dropLat/Lng and optional distanceKm. Unset
 * token → nulls so callers keep today's manual-km behaviour.
 */
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { haversineKm } from "@/modules/tracking/services/plausibility";

export type LatLng = { lat: number; lng: number };

export type RouteGeometry = {
  pickupLat: number | null;
  pickupLng: number | null;
  dropLat: number | null;
  dropLng: number | null;
  distanceKm: number | null;
};

type FetchLike = typeof fetch;

const MAPBOX_TIMEOUT_MS = 3_000;

function mapboxSignal(): AbortSignal {
  return AbortSignal.timeout(MAPBOX_TIMEOUT_MS);
}

function mapboxToken(): string | undefined {
  return env.MAPBOX_ACCESS_TOKEN;
}

export async function geocodeAddress(
  text: string,
  opts?: { fetchImpl?: FetchLike },
): Promise<LatLng | null> {
  const token = mapboxToken();
  const query = text.trim();
  if (!token || !query) return null;

  const fetchImpl = opts?.fetchImpl ?? fetch;
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`,
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("country", "IN");
  url.searchParams.set("limit", "1");

  try {
    const res = await fetchImpl(url.toString(), { signal: mapboxSignal() });
    if (!res.ok) {
      logger.warn({ status: res.status }, "geo.geocode.http_error");
      return null;
    }
    const body = (await res.json()) as {
      features?: { center?: [number, number] }[];
    };
    const center = body.features?.[0]?.center;
    if (!center || center.length < 2) return null;
    return { lng: center[0], lat: center[1] };
  } catch (err) {
    logger.warn({ err }, "geo.geocode.failed");
    return null;
  }
}

export async function drivingKm(
  a: LatLng,
  b: LatLng,
  opts?: { fetchImpl?: FetchLike },
): Promise<number | null> {
  const token = mapboxToken();
  if (!token) return roundKm(haversineKm(a, b));

  const fetchImpl = opts?.fetchImpl ?? fetch;
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${a.lng},${a.lat};${b.lng},${b.lat}`,
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("overview", "false");

  try {
    const res = await fetchImpl(url.toString(), { signal: mapboxSignal() });
    if (!res.ok) {
      logger.warn({ status: res.status }, "geo.directions.http_error");
      return roundKm(haversineKm(a, b));
    }
    const body = (await res.json()) as { routes?: { distance?: number }[] };
    const meters = body.routes?.[0]?.distance;
    if (typeof meters !== "number" || meters <= 0) {
      return roundKm(haversineKm(a, b));
    }
    return roundKm(meters / 1000);
  } catch (err) {
    logger.warn({ err }, "geo.directions.failed");
    return roundKm(haversineKm(a, b));
  }
}

export async function resolveBookingRoute(input: {
  pickupAddress: string;
  dropAddress: string;
  distanceKm?: number | null;
  fetchImpl?: FetchLike;
}): Promise<RouteGeometry> {
  const fetchImpl = input.fetchImpl;
  const [pickup, drop] = await Promise.all([
    geocodeAddress(input.pickupAddress, { fetchImpl }),
    geocodeAddress(input.dropAddress, { fetchImpl }),
  ]);

  let distanceKm = input.distanceKm != null && input.distanceKm > 0 ? input.distanceKm : null;
  if (distanceKm == null && pickup && drop) {
    distanceKm = await drivingKm(pickup, drop, { fetchImpl });
  }

  return {
    pickupLat: pickup?.lat ?? null,
    pickupLng: pickup?.lng ?? null,
    dropLat: drop?.lat ?? null,
    dropLng: drop?.lng ?? null,
    distanceKm,
  };
}

function roundKm(km: number): number {
  return Math.round(km * 100) / 100;
}
