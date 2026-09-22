import { describe, it, expect } from "vitest";
import { resolveTracingEnvironment } from "./tracing-environment.js";

describe("resolveTracingEnvironment()", () => {
  /**
   * An explicit tracing label lets deployments name traces independently of the runtime environment.
   * @scenario "an explicit tracing label wins over the runtime environment"
   */
  it("uses the tracing label over the runtime environment", () => {
    const env = { LANGFUSE_TRACING_ENVIRONMENT: "staging", NODE_ENV: "production" };

    expect(resolveTracingEnvironment(env)).toBe("staging");
  });

  /**
   * Without an explicit label, traces are grouped by the runtime environment.
   * @scenario "the runtime environment is used when no tracing label is set"
   */
  it("uses the runtime environment when no label is set", () => {
    expect(resolveTracingEnvironment({ NODE_ENV: "production" })).toBe("production");
  });

  /**
   * Local runs without any variable land in development, never polluting production views.
   * @scenario "development is the default when nothing is set"
   */
  it("falls back to development when nothing is set", () => {
    expect(resolveTracingEnvironment({})).toBe("development");
  });

  /**
   * An empty .env line must not create an unnamed environment.
   * @scenario "blank values count as unset"
   */
  it("treats blank values as unset", () => {
    expect(resolveTracingEnvironment({ LANGFUSE_TRACING_ENVIRONMENT: "  ", NODE_ENV: "" })).toBe("development");
  });
});
