import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, globalIgnores } from "eslint/config";
import tailwindcss from "eslint-plugin-tailwindcss";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tailwindConfigPath = path.join(__dirname, "src/app/globals.css");

const tailwindPluginSettings = {
  tailwindcss: {
    config: tailwindConfigPath,
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // ─── Block 1: Feature code (strict) ──────────────────────────────────────
  // Arbitrary Tailwind bracket values are forbidden. Use design tokens.
  // Will become "error" once all existing violations are cleared.
  {
    files: ["src/app/**/*.{ts,tsx}", "src/modules/**/*.{ts,tsx}"],
    plugins: { tailwindcss },
    settings: tailwindPluginSettings,
    rules: {
      // Block bracket notation: w-[372px], text-[13px], rounded-[17px] etc.
      "tailwindcss/no-arbitrary-value": "warn",
    },
  },

  // ─── Block 2: UI primitives + layout layer (relaxed) ─────────────────────
  // These files are the palette→intent mapping layer; arbitrary values are OK.
  {
    files: [
      "src/components/ui/**/*.{ts,tsx}",
      "src/layout/**/*.{ts,tsx}",
    ],
    plugins: { tailwindcss },
    settings: tailwindPluginSettings,
    rules: {
      "tailwindcss/no-arbitrary-value": "off",
    },
  },

  // ─── Block 3: General overrides ──────────────────────────────────────────
  {
    rules: {
      // TailAdmin's sidebar + theme provider use setState-in-effect for a
      // controlled-component pattern that is fine in practice.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
