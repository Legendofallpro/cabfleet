import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/** Constant-time Bearer comparison for Vercel cron (`Authorization: Bearer $CRON_SECRET`). */
export function isAuthorizedCronRequest(req: { headers: Headers }): boolean {
  if (!env.CRON_SECRET) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.CRON_SECRET}`;
  const received = Buffer.from(header);
  const wanted = Buffer.from(expected);
  if (received.length !== wanted.length) return false;
  return timingSafeEqual(received, wanted);
}

/** 503 when CRON_SECRET is unset; 401 when the Bearer token does not match. */
export function cronAuthGuard(
  req: { headers: Headers },
  path: string,
): NextResponse | null {
  if (!env.CRON_SECRET) {
    logger.warn({ path }, "cron.disabled.no_secret");
    return NextResponse.json({ error: "Cron disabled" }, { status: 503 });
  }
  if (!isAuthorizedCronRequest(req)) {
    logger.warn({ path }, "cron.unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
