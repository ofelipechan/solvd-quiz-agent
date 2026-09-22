/**
 * Default OpenRouter model id used for quiz generation, overridable via the
 * `OPENROUTER_LLM_MODEL` env var.
 *
 * Confirmed free-tier, `structured_outputs`-capable model by querying
 * OpenRouter's live model catalog directly (`GET https://openrouter.ai/api/v1/models`,
 * checked 2026-09-12): filtering for `pricing.prompt === "0"` and
 * `supported_parameters` including `"structured_outputs"` returned this id
 * among a handful of free, structured-output-capable models.
 */
const DEFAULT_OPENROUTER_MODEL_ID = "nvidia/nemotron-3-super-120b-a12b:free";

export const OPENROUTER_MODEL_ID =
  process.env.OPENROUTER_LLM_MODEL || DEFAULT_OPENROUTER_MODEL_ID;
