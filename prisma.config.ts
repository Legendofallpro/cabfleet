import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// For Supabase + pgbouncer setups, point DATABASE_URL at the pooled connection
// for the app at runtime, and use DIRECT_URL when running `prisma migrate` so
// migrations bypass the pooler. The migrate CLI auto-uses DIRECT_URL if set
// when it sees `?pgbouncer=true` in DATABASE_URL, so no extra config needed.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
