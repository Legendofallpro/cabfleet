/**
 * Location-point plausibility checks (Phase 7 W5 §S7).
 *
 * Pure functions, no DB access. Keeping these decoupled from the
 * ingest service so we can unit-test the maths trivially and reuse them
 * from any future code path (e.g. an offline reconciliation job).
 *
 * Rules implemented:
 *   1. Speed cap (env.LOCATION_MAX_SPEED_KPH) — both the client-reported
 *      speedKph AND the server-derived speed from (previous, current)
 *      must stay below.
 *   2. First-point distance (env.LOCATION_FIRST_POINT_MAX_KM) — the very
 *      first point of a booking must be within X km of the geocoded
 *      pickup, when pickup coordinates are known.
 *   3. Sudden teleport — derived speed against the immediately
 *      previous point is the second half of (1).
 *
 * NOT implemented (out of scope): jitter smoothing, kalman filtering,
 * cellular-handoff dead-zones. The driver app is expected to do its
 * own gps coalescing before posting.
 */

export const EARTH_RADIUS_KM = 6_371;

/** Distance between two lat/lng pairs in kilometres (great-circle). */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(s));
}

/** Speed in km/h between two timestamped points. Returns 0 if dt ≤ 0. */
export function derivedSpeedKph(
  prev: { lat: number; lng: number; recordedAt: Date },
  next: { lat: number; lng: number; recordedAt: Date },
): number {
  const dtMs = next.recordedAt.getTime() - prev.recordedAt.getTime();
  if (dtMs <= 0) return 0;
  const km = haversineKm(prev, next);
  const hours = dtMs / 3_600_000;
  return km / hours;
}

export type PlausibilityContext = {
  /** Booking pickup geocoded coords (may be unknown). */
  pickup: { lat: number; lng: number } | null;
  /** The immediately previous accepted point for this booking (any). */
  previous: {
    lat: number;
    lng: number;
    recordedAt: Date;
  } | null;
  /** True if this is the first point of the booking. */
  isFirstPoint: boolean;
  /** Limits (read from env at the call site so tests can stub easily). */
  maxSpeedKph: number;
  firstPointMaxKm: number;
};

export type PlausibilityVerdict =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Decide whether a candidate point is plausible. Flagged points are
 * still persisted upstream — this returns the verdict only.
 */
export function evaluatePoint(
  candidate: { lat: number; lng: number; recordedAt: Date; speedKph?: number | null },
  ctx: PlausibilityContext,
): PlausibilityVerdict {
  // 1a. Client-reported speed cap.
  if (
    candidate.speedKph !== undefined &&
    candidate.speedKph !== null &&
    candidate.speedKph > ctx.maxSpeedKph
  ) {
    return {
      ok: false,
      reason: `reported_speed_exceeds_cap(${candidate.speedKph.toFixed(1)}>${ctx.maxSpeedKph})`,
    };
  }

  // 1b. Derived speed against previous point.
  if (ctx.previous) {
    const derived = derivedSpeedKph(ctx.previous, candidate);
    if (derived > ctx.maxSpeedKph) {
      return {
        ok: false,
        reason: `derived_speed_exceeds_cap(${derived.toFixed(1)}>${ctx.maxSpeedKph})`,
      };
    }
  }

  // 2. First-point distance from pickup.
  if (
    ctx.isFirstPoint &&
    ctx.pickup &&
    ctx.firstPointMaxKm > 0
  ) {
    const km = haversineKm(ctx.pickup, candidate);
    if (km > ctx.firstPointMaxKm) {
      return {
        ok: false,
        reason: `first_point_too_far_from_pickup(${km.toFixed(2)}km>${ctx.firstPointMaxKm}km)`,
      };
    }
  }

  return { ok: true };
}
