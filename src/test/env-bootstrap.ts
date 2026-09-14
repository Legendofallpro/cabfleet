/**
 * Vitest env bootstrap (Wave 3).
 *
 * Unit tests import `@/lib/env` (via logger, db, etc.). Without CI placeholders
 * those imports throw. Fill only missing keys so a local `.env.local` still wins.
 *
 * Must stay import-free of `@/lib/env` — this file runs first.
 */
const PLACEHOLDERS: Record<string, string> = {
  SKIP_ENV_VALIDATION: "true",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db?schema=public",
  DIRECT_URL: "postgresql://user:pass@localhost:5432/db?schema=public",
  NEXT_PUBLIC_SUPABASE_URL: "http://localhost",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "ci-placeholder",
  SUPABASE_SERVICE_ROLE_KEY: "ci-placeholder",
  AUTH_PROOF_SECRET: "ci-placeholder-proof-secret-32ch",
};

for (const [key, value] of Object.entries(PLACEHOLDERS)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
