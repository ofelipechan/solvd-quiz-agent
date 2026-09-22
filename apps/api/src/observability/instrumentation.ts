import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { maskSensitiveData } from "./mask.js";
import { resolveTracingEnvironment } from "./tracing-environment.js";

/**
 * OpenTelemetry bootstrap for Langfuse tracing. Import this module first in
 * the process entry point so the span processor is registered before any
 * traced code runs. Credentials come from `LANGFUSE_PUBLIC_KEY`,
 * `LANGFUSE_SECRET_KEY` and `LANGFUSE_BASE_URL` (read by the processor).
 *
 * Exported so callers can `forceFlush()` (short-lived scripts) or shut the
 * SDK down on process exit; the processor batches spans in the background,
 * so exiting without a flush loses the tail of the trace stream.
 */
export const langfuseSpanProcessor = new LangfuseSpanProcessor({
  environment: resolveTracingEnvironment(process.env),
  mask: maskSensitiveData,
});

const sdk = new NodeSDK({
  serviceName: "quiz-agent-api",
  // Skip host/process resource detectors: they add noisy metadata (hostname,
  // OS user, full command line) to every observation without helping debug quizzes.
  autoDetectResources: false,
  spanProcessors: [langfuseSpanProcessor],
});
sdk.start();

/** Flushes buffered spans and releases the OpenTelemetry SDK. Call once, on shutdown. */
export function shutdownTracing(): Promise<void> {
  return sdk.shutdown();
}
