import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Python bridge artifacts:
    "services/leboncoin-bridge/.venv/**",
    "services/leboncoin-bridge/.pytest_cache/**",
    "services/leboncoin-bridge/**/pycache/**",
    "services/leboncoin-bridge/**/__pycache__/**",
  ]),
]);

export default eslintConfig;
