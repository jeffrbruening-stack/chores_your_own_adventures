import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    // Run each test file in its own context so mocks don't bleed
    pool: "forks",
  },
  resolve: {
    conditions: ["node", "import", "default"],
  },
});
