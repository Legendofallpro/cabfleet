import { config as loadEnv } from "dotenv";
import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma's CLI does NOT auto-load .env.local (that is a Next.js convention).
// Load .env.local first, then fall back to .env, so a single env file works
// for both the Next.js runtime and `prisma migrate` / `prisma db ...`.
loadEnv({ path: ".env.local" });
loadEnv();

// Why two URLs:
//   DATABASE_URL  -> Supabase Transaction-mode pooler (port 6543). Used by the
//                    app at runtime. Cheap, high concurrency, but kills prepared
//                    statements between queries which breaks `prisma migrate`.
//   DIRECT_URL    -> Supabase Session-mode pooler (port 5432) or direct
//                    connection. Used by `prisma migrate` / introspection.
//
// In Prisma 7 the schema's `datasource` block no longer accepts `directUrl`,
// so we resolve the right URL here. The order is: explicit DIRECT_URL when
// set (e.g. during `prisma migrate dev`), otherwise the runtime DATABASE_URL.
const migrateUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!migrateUrl) {
  throw new Error(
    "DATABASE_URL (or DIRECT_URL) must be set in .env.local or .env before running Prisma.",
  );
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: migrateUrl,
  },
});
