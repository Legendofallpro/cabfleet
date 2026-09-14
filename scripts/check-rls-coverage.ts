/**
 * CI guard: every Prisma `model` in schema.prisma must appear in the
 * PostgREST deny-all migration so `migrate deploy` cannot ship a table
 * that is granted to `anon`.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { exit } from "node:process";

const ROOT = join(__dirname, "..");
const SCHEMA = join(ROOT, "prisma", "schema.prisma");
const MIGRATION = join(
  ROOT,
  "prisma",
  "migrations",
  "20260914150000_rls_force_deny_postgrest",
  "migration.sql",
);

const schema = readFileSync(SCHEMA, "utf8");
const models = [...schema.matchAll(/^model\s+([A-Za-z0-9_]+)\s+\{/gm)].map(
  (m) => m[1]!,
);

if (models.length === 0) {
  console.error("No Prisma models found in schema.prisma");
  exit(1);
}

const migration = readFileSync(MIGRATION, "utf8");
const missing = models.filter((name) => {
  const quoted = `'${name}'`;
  const ident = `"${name}"`;
  return !migration.includes(quoted) && !migration.includes(ident);
});

if (missing.length > 0) {
  console.error(
    `✖ RLS coverage gap — add these models to ${MIGRATION}:\n  ${missing.join("\n  ")}`,
  );
  exit(1);
}

console.log(`✔ RLS coverage: ${models.length} Prisma models listed in deny-PostgREST migration.`);
