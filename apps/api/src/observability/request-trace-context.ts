import { propagateAttributes } from "@langfuse/tracing";

/** The slice of a Fastify request the trace context needs (structurally satisfied by `FastifyRequest`). */
export interface TraceableRequest {
  userId?: string;
  method: string;
  routeOptions: { url?: string };
}

/**
 * Runs `fn` with the request's trace context active: every observation created
 * inside carries the authenticated `userId` (per-user filtering and cost
 * attribution in Langfuse) and the handling route pattern as trace metadata.
 * The route *pattern* (`/api/quizzes/:id`) is used, never the concrete URL,
 * to keep metadata low-cardinality.
 */
export function withRequestTraceContext<T>(request: TraceableRequest, fn: () => Promise<T>): Promise<T> {
  const route = `${request.method} ${request.routeOptions.url ?? "unknown"}`;
  return propagateAttributes({ userId: request.userId, metadata: { route } }, fn);
}
