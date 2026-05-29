import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Coerce common truthy/falsy strings into booleans. Supabase / Vercel env
 * vars are always strings, so `"true"` / `"1"` / `"yes"` all mean enabled.
 */
const boolFromString = z
  .union([z.boolean(), z.string()])
  .transform((v) => {
    if (typeof v === "boolean") return v;
    return ["true", "1", "yes", "on"].includes(v.toLowerCase());
  })
  .pipe(z.boolean())
  .default(false);

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    /** Shared secret used to authenticate Vercel Cron requests. */
    CRON_SECRET: z.string().min(1).optional(),
    /** Resend API key for transactional emails (Phase 5). */
    RESEND_API_KEY: z.string().min(1).optional(),
    /**
     * HMAC secret for signing the password-setup proof cookie issued after
     * a successful invite/recovery callback. Must be at least 32 characters.
     */
    AUTH_PROOF_SECRET: z.string().min(32),
    /** Upstash Redis REST credentials for the rate limiter (optional in dev). */
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

    // ── Phase 7 W0: error tracking + feature flags ───────────────────────
    /** Sentry DSN (optional). When unset, captureError() falls back to pino-only. */
    SENTRY_DSN: z.string().url().optional(),

    /** W1: enables the org-aware Prisma extension. Keep false until backfill + RLS soak complete. */
    MULTI_ORG_ENABLED: boolFromString,
    /** W2: enables NotificationService dispatch. Default off in non-prod. */
    NOTIFICATIONS_ENABLED: boolFromString,
    /** W3: which payment provider to use. MANUAL is the safe default. */
    PAYMENT_GATEWAY: z.enum(["MANUAL", "RAZORPAY"]).default("MANUAL"),
    /** W4: gates /api/v1/* — blocked on Upstash-backed rate limiter being wired (§4.4). */
    API_V1_ENABLED: boolFromString,
    /** W5: enables TripLocation ingestion + the live customer map. */
    REALTIME_TRACKING_ENABLED: boolFromString,

    // ── Phase 7 W2: Twilio (WhatsApp) ────────────────────────────────────
    TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
    TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
    TWILIO_WHATSAPP_FROM: z.string().min(1).optional(),
    /** §7.4 S8: pages on-call when daily Twilio spend exceeds this USD ceiling. */
    TWILIO_DAILY_SPEND_THRESHOLD_USD: z.coerce.number().positive().default(50),

    // ── Phase 7 W3: Razorpay ─────────────────────────────────────────────
    RAZORPAY_KEY_ID: z.string().min(1).optional(),
    RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
    /** §7.5 S25: comma-separated CIDR ranges Razorpay sends webhooks from. */
    RAZORPAY_WEBHOOK_IPS: z.string().optional(),
    /** §7.5 S12: refunds above this rupee amount require a second admin approval. */
    REFUND_AUTO_APPROVE_LIMIT_INR: z.coerce.number().nonnegative().default(10_000),

    // ── Phase 7 W4: REST v1 CORS ─────────────────────────────────────────
    /** Comma-separated list of origins permitted by the v1 CORS preflight. */
    MOBILE_APP_ORIGIN: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

    // ── Phase 7 W3: Razorpay Checkout (client-side) ──────────────────────
    NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().min(1).optional(),

    // ── Phase 7 W5: Map tile provider ────────────────────────────────────
    NEXT_PUBLIC_MAP_TILES_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
    CRON_SECRET: process.env.CRON_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    AUTH_PROOF_SECRET: process.env.AUTH_PROOF_SECRET,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    SENTRY_DSN: process.env.SENTRY_DSN,
    MULTI_ORG_ENABLED: process.env.MULTI_ORG_ENABLED,
    NOTIFICATIONS_ENABLED: process.env.NOTIFICATIONS_ENABLED,
    PAYMENT_GATEWAY: process.env.PAYMENT_GATEWAY,
    API_V1_ENABLED: process.env.API_V1_ENABLED,
    REALTIME_TRACKING_ENABLED: process.env.REALTIME_TRACKING_ENABLED,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM,
    TWILIO_DAILY_SPEND_THRESHOLD_USD: process.env.TWILIO_DAILY_SPEND_THRESHOLD_USD,
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
    RAZORPAY_WEBHOOK_IPS: process.env.RAZORPAY_WEBHOOK_IPS,
    REFUND_AUTO_APPROVE_LIMIT_INR: process.env.REFUND_AUTO_APPROVE_LIMIT_INR,
    MOBILE_APP_ORIGIN: process.env.MOBILE_APP_ORIGIN,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    NEXT_PUBLIC_MAP_TILES_URL: process.env.NEXT_PUBLIC_MAP_TILES_URL,
  },
  skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  emptyStringAsUndefined: true,
});

// Fail-closed runtime check: production must set CRON_SECRET. We don't enforce
// this in the schema above because `createEnv` does not support cross-field
// refinement without losing inferred types.
if (
  env.NODE_ENV === "production" &&
  !env.CRON_SECRET &&
  process.env.SKIP_ENV_VALIDATION !== "true"
) {
  throw new Error(
    "CRON_SECRET must be set in production. Cron endpoints refuse to run otherwise.",
  );
}
