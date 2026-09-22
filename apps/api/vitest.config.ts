import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Domain/service unit tests. Repository, route and db tests are
    // integration-tier (real Postgres / Fastify .inject()) and run via
    // vitest.integration.config.ts instead - see the Test Coverage Matrix.
    include: ["src/**/*.test.ts"],
    exclude: ["src/repositories/**", "src/routes/**", "src/db/**"],
    passWithNoTests: true,
  },
});
