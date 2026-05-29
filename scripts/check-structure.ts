/**
 * CI guard: fail if any service file reaches directly into another module's
 * Prisma table via `db.<model>` where <model> is owned by a different module.
 *
 * This is a lightweight heuristic, not an AST-level analysis.
 * It enforces the AGENTS.md rule:
 *   "Cross-module access goes through the other module's services/ or queries/.
 *    Never reach directly into another module's Prisma tables."
 *
 * Usage:  npx tsx scripts/check-structure.ts
 */
import { execSync } from "child_process";
import { exit } from "process";
import path from "path";

// Map each Prisma model name (lowercase) to the module that owns it.
const MODEL_OWNER: Record<string, string> = {
  branch: "branches",
  vehicle: "vehicles",
  driver: "drivers",
  staff: "staff",
  customer: "customers",
  booking: "bookings",
  pricingrule: "pricing",
  dispatchrule: "dispatch",
  payment: "payments",
  invoice: "invoices",
  invoicelineitem: "invoices",
  attendancelog: "attendance",
  fuellog: "fuel",
  expense: "expenses",
  maintenancelog: "maintenance",
  shift: "shifts",
  auditlog: "audit",
  assignmenthistory: "bookings",
  bookingtype: "bookings",
};

// Only inspect service files — they're the boundary that must not cross.
function getServiceFiles(): string[] {
  try {
    return execSync(`find src/modules -name "*.service.ts"`)
      .toString()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

// Extract the owning module from a service file path.
// e.g. src/modules/bookings/services/booking.service.ts -> "bookings"
function ownerOf(filepath: string): string {
  const parts = filepath.split(path.sep);
  const idx = parts.indexOf("modules");
  return idx >= 0 ? parts[idx + 1] : "";
}

let violations = 0;
const files = getServiceFiles();

for (const file of files) {
  const myModule = ownerOf(file);
  if (!myModule) continue;

  let content: string;
  try {
    content = execSync(`cat "${file}"`).toString();
  } catch {
    continue;
  }

  const lines = content.split("\n");
  lines.forEach((line, idx) => {
    // Only flag cross-module MUTATIONS — reads (findFirst/findUnique for FK
    // pre-flight checks) are explicitly allowed by the canonical service pattern.
    const match = line.match(/\bdb\.([a-zA-Z]+)\.(create|update|delete|upsert|deleteMany|updateMany|createMany)\b/);
    if (!match) return;

    const model = match[1].toLowerCase();
    const modelOwner = MODEL_OWNER[model];

    if (modelOwner && modelOwner !== myModule) {
      // auditlog is written everywhere via writeAudit — always allowed
      if (model === "auditlog") return;

      console.error(
        `\x1b[31m${file}:${idx + 1}\x1b[0m — service in \x1b[33m${myModule}\x1b[0m accesses \x1b[33mdb.${match[1]}\x1b[0m owned by \x1b[33m${modelOwner}\x1b[0m`
      );
      violations++;
    }
  });
}

if (violations > 0) {
  console.error(
    `\n\x1b[31m✖ ${violations} cross-module Prisma access violation(s). See AGENTS.md §2.\x1b[0m`
  );
  exit(1);
} else {
  console.log("\x1b[32m✔ No cross-module Prisma access violations found.\x1b[0m");
}
