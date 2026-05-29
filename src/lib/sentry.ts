/**
 * Server-side error tracking (Phase 7 W0, §7.8 S16).
 *
 * Today: logs structured events to pino. The PII scrubber and capture
 * surface are stable so wiring an actual reporter (Sentry, BetterStack,
 * Logtail) is a one-file change later.
 *
 * To enable Sentry:
 *   1. `npm install --save @sentry/nextjs --legacy-peer-deps`
 *   2. Add the SDK import + `Sentry.init({ dsn: env.SENTRY_DSN, ...sentryOptions() })`
 *      in `instrumentation.ts` and the appropriate per-runtime config files.
 *   3. In `captureError`/`captureMessage` below, call `Sentry.captureException`
 *      / `Sentry.captureMessage` with the already-scrubbed event.
 *
 * Until then: every site that currently logs an error or warning can call
 * `captureError(err, { tags, context })` to get a consistent shape, and
 * flipping to a real reporter is non-invasive.
 */
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Keys that always carry PII. Stripped from any nested object before the
 * event leaves the process. Matches the redact paths in `src/lib/logger.ts`
 * but operates on objects rather than pino's path string syntax.
 */
const PII_KEYS = new Set<string>([
  "email",
  "phone",
  "address",
  "fullName",
  "full_name",
  "name",
  "dob",
  "lat",
  "lng",
  "latitude",
  "longitude",
  "password",
  "token",
  "authorization",
  "cookie",
]);

const REDACTED = "[redacted]";

/**
 * Recursively redact any PII keys in the supplied value. Pure, side-effect-free
 * (returns a new object — never mutates the input). Caps recursion at 6 levels
 * and array length at 100 to bound work on deep/wide payloads.
 */
export function scrubPii<T>(value: T, depth = 0): T {
  if (depth > 6) return value;
  if (value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    const limited = value.slice(0, 100);
    return limited.map((item) => scrubPii(item, depth + 1)) as unknown as T;
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (PII_KEYS.has(key)) {
      out[key] = REDACTED;
      continue;
    }
    out[key] = scrubPii(val, depth + 1);
  }
  return out as unknown as T;
}

export type CaptureContext = {
  /** Logical event name, e.g. "webhook.razorpay.signature_invalid". */
  event?: string;
  /** Coarse tags for slicing in the error dashboard. */
  tags?: Record<string, string>;
  /** Free-form structured context. Will be PII-scrubbed before report. */
  extra?: Record<string, unknown>;
};

/**
 * Capture a thrown Error. Always logs via pino; forwards to Sentry when wired.
 *
 * The error message is NOT scrubbed — callers must throw user-safe messages
 * (we already enforce this with `AppError` vs the generic-message fallback in
 * `src/lib/errors.ts`). Only the `extra` payload and `cause` are scrubbed.
 */
export function captureError(err: unknown, context: CaptureContext = {}): void {
  const safeExtra = context.extra ? scrubPii(context.extra) : undefined;
  logger.error(
    {
      err,
      event: context.event,
      tags: context.tags,
      extra: safeExtra,
      sentry: env.SENTRY_DSN ? "pending" : "disabled",
    },
    context.event ?? "captureError",
  );
}

export function captureMessage(
  message: string,
  context: CaptureContext = {},
): void {
  const safeExtra = context.extra ? scrubPii(context.extra) : undefined;
  logger.warn(
    {
      event: context.event,
      tags: context.tags,
      extra: safeExtra,
      sentry: env.SENTRY_DSN ? "pending" : "disabled",
    },
    message,
  );
}

/**
 * Sentry init options. Exported so a future `instrumentation.ts` can pass
 * them straight to `Sentry.init({ dsn, ...sentryOptions() })`.
 *
 * `beforeSend` runs the same scrubber on the outgoing event payload so any
 * data Sentry's own SDK packs in (request body, contexts) is filtered too.
 */
export function sentryOptions() {
  return {
    sendDefaultPii: false,
    tracesSampleRate: 0.05,
    beforeSend(event: Record<string, unknown>): Record<string, unknown> | null {
      const request = event.request as
        | { headers?: Record<string, string>; data?: unknown }
        | undefined;
      if (request?.headers) {
        delete request.headers.authorization;
        delete request.headers.Authorization;
        delete request.headers.cookie;
        delete request.headers.Cookie;
      }
      if (request?.data) {
        request.data = scrubPii(request.data);
      }
      if (event.contexts) {
        event.contexts = scrubPii(event.contexts);
      }
      if (event.extra) {
        event.extra = scrubPii(event.extra);
      }
      return event;
    },
  };
}
