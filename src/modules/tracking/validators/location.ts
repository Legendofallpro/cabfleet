/**
 * Zod schemas for live location ingest (Phase 7 W5).
 *
 * Bounded numerically because we feed straight into Decimal(9,6) /
 * Decimal(6,2) columns — anything outside the geographic / speed sane
 * range is a client bug, not a real point.
 */
import { z } from "zod";

export const locationPointSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  /** Reported speed in km/h. NULL means client didn't compute one. */
  speedKph: z.number().nonnegative().optional(),
  /** Wall-clock time the point was sampled on the device. */
  recordedAt: z.coerce.date(),
});

export type LocationPointInput = z.infer<typeof locationPointSchema>;

export const locationBatchSchema = z.object({
  points: z.array(locationPointSchema).min(1).max(60),
});

export type LocationBatchInput = z.infer<typeof locationBatchSchema>;
