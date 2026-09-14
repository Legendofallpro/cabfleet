import { NextResponse } from "next/server";
import { env } from "@/lib/env";

const ALLOWED_HEADERS = "Authorization, Content-Type, Idempotency-Key";
const ALLOWED_METHODS = "GET, POST, PATCH, PUT, DELETE, OPTIONS";

function allowedOrigin(req: Request): string | null {
  const configured = env.MOBILE_APP_ORIGIN;
  if (!configured) return null;
  const origin = req.headers.get("origin");
  if (!origin) return null;
  return origin === configured ? configured : null;
}

/** Attach CORS headers when Origin matches `MOBILE_APP_ORIGIN`. */
export function applyMobileCors(req: Request, response: NextResponse): NextResponse {
  const origin = allowedOrigin(req);
  if (!origin) return response;
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.headers.set("Vary", "Origin");
  return response;
}

export function mobileCorsPreflight(req: Request): NextResponse {
  return applyMobileCors(req, new NextResponse(null, { status: 204 }));
}
