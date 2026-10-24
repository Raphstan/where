import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

/** Tests en direct contre l'API Anthropic : npm run test:live. Lit ANTHROPIC_API_KEY depuis .env.local. */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "src/test/server-only.ts"),
    },
  },
  test: {
    include: ["src/**/*.live.test.ts"],
    env: loadEnv("development", process.cwd(), ""),
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
