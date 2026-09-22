import { describe, it, expect, beforeEach } from "vitest";
import { startActiveObservation } from "@langfuse/tracing";
import { withRequestTraceContext } from "./request-trace-context.js";
import { setupInMemoryTracing, findSpan, readAttribute } from "./testing/in-memory-tracing.js";

const tracing = setupInMemoryTracing();

function authenticatedRequest(userId?: string) {
  return { userId, method: "POST", routeOptions: { url: "/api/quizzes" } };
}

async function runTracedWork() {
  await startActiveObservation("unit-of-work", async (span) => {
    span.update({ output: "done" });
  });
}

describe("withRequestTraceContext()", () => {
  beforeEach(() => tracing.reset());

  describe("given an authenticated request", () => {
    /**
     * Traces are attributable to the signed-in user for per-user filtering and cost.
     * @scenario "observations inside a request are attributed to the signed-in user"
     */
    it("attributes inner observations to the user", async () => {
      await withRequestTraceContext(authenticatedRequest("user-42"), runTracedWork);

      const span = findSpan(await tracing.spans(), "unit-of-work");
      expect(readAttribute(span, "user.id")).toBe("user-42");
    });

    /**
     * The handling route pattern (not the concrete URL) is recorded so traces correlate with the API surface.
     * @scenario "observations inside a request record the handling route"
     */
    it("records the handling route on the trace", async () => {
      await withRequestTraceContext(authenticatedRequest("user-42"), runTracedWork);

      const span = findSpan(await tracing.spans(), "unit-of-work");
      expect(readAttribute(span, "langfuse.trace.metadata.route")).toBe("POST /api/quizzes");
    });

    /** The wrapper is transparent: the wrapped function's return value is handed back unchanged. */
    it("hands back the result of the wrapped work", async () => {
      const result = await withRequestTraceContext(authenticatedRequest("user-42"), async () => 7);

      expect(result).toBe(7);
    });
  });

  describe("given an unauthenticated request", () => {
    /**
     * Anonymous contexts still trace, just without a user id.
     * @scenario "an anonymous request is traced without a user"
     */
    it("attributes inner observations to no user", async () => {
      await withRequestTraceContext(authenticatedRequest(undefined), runTracedWork);

      const span = findSpan(await tracing.spans(), "unit-of-work");
      expect(readAttribute(span, "user.id")).toBeUndefined();
    });
  });
});
