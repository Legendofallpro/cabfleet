/**
 * CI guard: every Prisma `model` in schema.prisma must appear in the
 * PostgREST deny-all migration so `migrate deploy` cannot ship a table
 * that is granted to `anon`.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { exit } from "node:process";

const ROOT = join(__dirname, "..");
const SCHEMA = join(ROOT, "prisma", "schema.prisma");

function readAllMigrations(): string {
  const dir = join(ROOT, "prisma", "migrations");
  const chunks: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "migration_lock.toml") continue;
    const sqlPath = join(dir, name, "migration.sql");
    try {
      chunks.push(readFileSync(sqlPath, "utf8"));
    } catch {
      /* skip */
    }
  }
  return chunks.join("\n");
}

const schema = readFileSync(SCHEMA, "utf8");
const models = [...schema.matchAll(/^model\s+([A-Za-z0-9_]+)\s+\{/gm)].map(
  (m) => m[1]!,
);

if (models.length === 0) {
  console.error("No Prisma models found in schema.prisma");
  exit(1);
}

const migration = readAllMigrations();
const missing = models.filter((name) => {
  const quoted = `'${name}'`;
  const ident = `"${name}"`;
  return !migration.includes(quoted) && !migration.includes(ident);
});

if (missing.length > 0) {
  console.error(
    `✖ RLS coverage gap — add these models to a prisma/migrations/**/migration.sql:\n  ${missing.join("\n  ")}`,
  );
  exit(1);
}

console.log(`✔ RLS coverage: ${models.length} Prisma models listed in deny-PostgREST migration.`);
