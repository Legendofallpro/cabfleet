/**
 * POST /api/v1/trips/:id/location — single live-location point.
 *
 * STUB. Implementation lands in Workstream 5 (TripLocation + Supabase
 * Realtime). Surface is reserved here so the OpenAPI spec + RN client
 * generation can ship without churn when W5 lands.
 *
 * Returns 501 NOT_IMPLEMENTED. Rate-limited at apiLocation so a buggy
 * client doesn't burn a driver's token budget while waiting on W5.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { LIMITS } from "@/lib/rate-limit";
import { withApiHandler } from "@/lib/auth/withApiHandler";

export const dynamic = "force-dynamic";

const locationSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  speedKph: z.number().nonnegative().optional(),
  recordedAt: z.coerce.date(),
});

type Body = z.infer<typeof locationSchema>;
type Params = { id: string };

export const POST = withApiHandler<Body, Params>({
  schema: locationSchema,
  rateLimit: { key: "trips.location", opts: LIMITS.apiLocation },
  handler: async () => {
    return new NextResponse(
      JSON.stringify({
        error: {
          code: "NOT_IMPLEMENTED",
          message: "Location ingestion ships in Workstream 5.",
        },
      }),
      { status: 501, headers: { "content-type": "application/json" } },
    );
  },
});
