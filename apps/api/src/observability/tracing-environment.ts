const DEFAULT_TRACING_ENVIRONMENT = "development";

function nonBlank(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Picks the Langfuse `environment` label for exported traces so local runs never
 * pollute production dashboards: explicit `LANGFUSE_TRACING_ENVIRONMENT`, then
 * `NODE_ENV`, then `development`.
 */
export function resolveTracingEnvironment(env: Record<string, string | undefined>): string {
  return nonBlank(env.LANGFUSE_TRACING_ENVIRONMENT) ?? nonBlank(env.NODE_ENV) ?? DEFAULT_TRACING_ENVIRONMENT;
}
