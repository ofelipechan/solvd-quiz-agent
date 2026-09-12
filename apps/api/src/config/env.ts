/**
 * OpenRouter model id used for quiz generation.
 *
 * Confirmed free-tier, `structured_outputs`-capable model by querying
 * OpenRouter's live model catalog directly (`GET https://openrouter.ai/api/v1/models`,
 * checked 2026-09-12): filtering for `pricing.prompt === "0"` and
 * `supported_parameters` including `"structured_outputs"` returned this id
 * among a handful of free, structured-output-capable models.
 */
export const OPENROUTER_MODEL_ID = "nvidia/nemotron-3-super-120b-a12b:free";

export function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }
  return key;
}
