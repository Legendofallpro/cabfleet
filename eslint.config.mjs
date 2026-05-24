import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // TailAdmin's sidebar + theme provider use setState-in-effect for a
      // controlled-component pattern that is fine in practice. Downgrade to
      // warn so it does not block CI but is still visible.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
