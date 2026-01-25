import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "packages/core/vitest.config.ts",
      "packages/ui/vitest.config.ts",
      "apps/web/vitest.config.ts",
      "apps/desktop/vitest.config.ts",
    ],
  },
});
