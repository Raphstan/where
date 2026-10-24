import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "server-only": path.resolve(import.meta.dirname, "src/test/server-only.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Les tests en direct contre l'API Anthropic ont leur propre config (vitest.live.config.mts).
    exclude: [...configDefaults.exclude, "src/**/*.live.test.ts"],
  },
});
