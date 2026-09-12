import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/repositories/**/*.test.ts", "src/routes/**/*.test.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
    passWithNoTests: true,
  },
});
