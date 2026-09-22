import type { MaskFunction } from "@langfuse/otel";

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
/** Provider-style API keys (OpenRouter `sk-or-…`, Langfuse `sk-lf-…`/`pk-lf-…`, OpenAI `sk-…`). */
const API_KEY_PATTERN = /\b[sp]k-[A-Za-z0-9_-]{8,}\b/g;
const BEARER_TOKEN_PATTERN = /Bearer\s+[A-Za-z0-9._~+/-]+=*/g;

/**
 * Langfuse `mask` hook: redacts PII (e-mails) and secrets from every traced
 * input/output/metadata value before it leaves the process. Applied to the
 * stringified attribute value; anything that is not a string passes through.
 */
export const maskSensitiveData: MaskFunction = ({ data }) => {
  if (typeof data !== "string") {
    return data;
  }
  return data
    .replace(EMAIL_PATTERN, "[EMAIL_REDACTED]")
    .replace(API_KEY_PATTERN, "[SECRET_REDACTED]")
    .replace(BEARER_TOKEN_PATTERN, "Bearer [SECRET_REDACTED]");
};
