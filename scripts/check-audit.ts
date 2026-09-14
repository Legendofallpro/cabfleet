/**
 * Fail CI when `npm audit --omit=dev` reports a high/critical advisory on a
 * package that is not in `.github/npm-audit-allowlist.json`.
 *
 * Known Next/maplibre/axios findings stay listed until we can bump those
 * packages. New production dependencies must not silently go green.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { exit } from "node:process";

const ROOT = join(__dirname, "..");
const allow = new Set(
  (JSON.parse(readFileSync(join(ROOT, ".github/npm-audit-allowlist.json"), "utf8"))
    .packages as string[]) ?? [],
);

type AuditReport = {
  vulnerabilities?: Record<string, { severity?: string }>;
};

let stdout = "";
try {
  stdout = execSync("npm audit --omit=dev --json", {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
} catch (err) {
  stdout = (err as { stdout?: string }).stdout ?? "";
}

let report: AuditReport;
try {
  report = JSON.parse(stdout) as AuditReport;
} catch {
  console.error("✖ npm audit did not return JSON");
  exit(1);
}

const unexpected: string[] = [];
for (const [name, vuln] of Object.entries(report.vulnerabilities ?? {})) {
  const severity = vuln.severity ?? "";
  if (severity !== "high" && severity !== "critical") continue;
  if (!allow.has(name)) unexpected.push(`${name} (${severity})`);
}

if (unexpected.length > 0) {
  console.error(
    `✖ High/critical production advisories not on the allowlist:\n  ${unexpected.join("\n  ")}\nUpdate the dependency or add it to .github/npm-audit-allowlist.json with a reason.`,
  );
  exit(1);
}

console.log("✔ npm audit: no unexpected high/critical production advisories.");
