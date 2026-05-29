import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

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
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
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
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
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
