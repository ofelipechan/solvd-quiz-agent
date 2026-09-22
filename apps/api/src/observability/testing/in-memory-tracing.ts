import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor, type LangfuseSpanProcessorParams } from "@langfuse/otel";

type SpanExporter = NonNullable<LangfuseSpanProcessorParams["exporter"]>;

/** A finished span as handed to the exporter (name, attributes, status, parent link). */
export type ExportedSpan = Parameters<SpanExporter["export"]>[0][number];

/**
 * Minimal exporter that keeps spans in memory so tests can assert on what
 * would have been sent to Langfuse, without any network or credentials.
 */
class InMemorySpanExporter implements SpanExporter {
  readonly spans: ExportedSpan[] = [];

  export(spans: ExportedSpan[], resultCallback: Parameters<SpanExporter["export"]>[1]): void {
    this.spans.push(...spans);
    resultCallback({ code: 0 });
  }

  async shutdown(): Promise<void> {}

  async forceFlush(): Promise<void> {}

  reset(): void {
    this.spans.length = 0;
  }
}

export interface InMemoryTracing {
  /** Waits for in-flight exports, then drops every captured span; call in `beforeEach`. */
  reset(): Promise<void>;
  /** Waits for pending exports and returns every span captured since the last reset. */
  spans(): Promise<ExportedSpan[]>;
}

let singleton: InMemoryTracing | undefined;

/**
 * Registers the OpenTelemetry SDK with the real `LangfuseSpanProcessor`, but
 * pointed at an in-memory exporter. Global OTel registration is process-wide,
 * so the setup is a module-level singleton shared by every test in the file.
 */
export function setupInMemoryTracing(): InMemoryTracing {
  if (singleton) {
    return singleton;
  }

  const exporter = new InMemorySpanExporter();
  const processor = new LangfuseSpanProcessor({ exporter, exportMode: "immediate" });
  new NodeSDK({ autoDetectResources: false, spanProcessors: [processor] }).start();

  singleton = {
    reset: async () => {
      await processor.forceFlush();
      exporter.reset();
    },
    spans: async () => {
      await processor.forceFlush();
      return [...exporter.spans];
    },
  };
  return singleton;
}

/** Returns the single span with `name`, failing loudly when it is missing or ambiguous. */
export function findSpan(spans: ExportedSpan[], name: string): ExportedSpan {
  const matches = spans.filter((s) => s.name === name);
  if (matches.length !== 1) {
    throw new Error(`expected exactly one span named "${name}", found ${matches.length}`);
  }
  return matches[0];
}

/** Reads a span attribute, JSON-parsing it when Langfuse serialized an object. */
export function readAttribute(span: ExportedSpan, key: string): unknown {
  const raw = span.attributes[key];
  if (typeof raw !== "string") {
    return raw;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/** True when `child` is nested directly under `parent`. */
export function isChildOf(child: ExportedSpan, parent: ExportedSpan): boolean {
  return child.parentSpanContext?.spanId === parent.spanContext().spanId;
}
