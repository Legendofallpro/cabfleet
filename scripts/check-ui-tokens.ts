/**
 * CI guard: fail if any feature code in src/app or src/modules uses
 * raw palette colour classes that are forbidden per AGENTS.md §13.
 *
 * Usage:  npx tsx scripts/check-ui-tokens.ts
 */
import { execSync } from "child_process";
import { exit } from "process";

const FORBIDDEN = [
  // Raw text colours
  /\btext-gray-[0-9]/,
  /\btext-brand-[0-9]/,
  // Raw backgrounds
  /\bbg-gray-[0-9]/,
  /\bbg-brand-[0-9]/,
  /\bbg-white\b/,
  /dark:bg-white/,
  // Raw borders
  /\bborder-gray-[0-9]/,
  /dark:border-gray-[0-9]/,
  // Opacity palette hacks
  /bg-brand-[0-9]+\/[0-9]/,
  /bg-success-[0-9]+\/[0-9]/,
  /bg-error-[0-9]+\/[0-9]/,
  // Arbitrary text sizes in feature code (layout-only arbitrary values are tolerated)
  /\btext-\[[\d.]+p/,
  /\brounded-\[[\d.]+p/,
];

const DIRS = ["src/app", "src/modules"];
// Files in these dirs are palette-aware (ui primitives or theme)
const EXCLUDE_PATTERNS = [
  "src/components/ui/",
  "src/app/globals.css",
  "node_modules",
  ".next",
];

let violations = 0;

for (const dir of DIRS) {
  let files: string[];
  try {
    files = execSync(`find ${dir} -name "*.tsx" -o -name "*.ts"`)
      .toString()
      .split("\n")
      .filter(Boolean)
      .filter((f) => !EXCLUDE_PATTERNS.some((ex) => f.includes(ex)));
  } catch {
    continue;
  }

  for (const file of files) {
    let content: string;
    try {
      content = execSync(`cat "${file}"`).toString();
    } catch {
      continue;
    }

    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      for (const pattern of FORBIDDEN) {
        if (pattern.test(line)) {
          console.error(`\x1b[31m${file}:${idx + 1}\x1b[0m — forbidden token: ${line.trim()}`);
          violations++;
          break;
        }
      }
    });
  }
}

if (violations > 0) {
  console.error(`\n\x1b[31m✖ ${violations} UI token violation(s). See AGENTS.md §13.\x1b[0m`);
  exit(1);
} else {
  console.log("\x1b[32m✔ No UI token violations found.\x1b[0m");
}
