/**
 * POST /api/v1/trips/:id/location/batch — batched live-location ingest.
 *
 * STUB. Body capped at 16 KiB (≈60 points × ~250B each) to keep the
 * mobile client honest about batching. Implementation lands in
 * Workstream 5.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { LIMITS } from "@/lib/rate-limit";
import { withApiHandler } from "@/lib/auth/withApiHandler";

export const dynamic = "force-dynamic";

const pointSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  speedKph: z.number().nonnegative().optional(),
  recordedAt: z.coerce.date(),
});

const batchSchema = z.object({
  points: z.array(pointSchema).min(1).max(60),
});

type Body = z.infer<typeof batchSchema>;
type Params = { id: string };

export const POST = withApiHandler<Body, Params>({
  schema: batchSchema,
  maxBodyBytes: 16 * 1024,
  rateLimit: { key: "trips.location.batch", opts: LIMITS.apiLocation },
  handler: async () => {
    return new NextResponse(
      JSON.stringify({
        error: {
          code: "NOT_IMPLEMENTED",
          message: "Batched location ingestion ships in Workstream 5.",
        },
      }),
      { status: 501, headers: { "content-type": "application/json" } },
    );
  },
});
