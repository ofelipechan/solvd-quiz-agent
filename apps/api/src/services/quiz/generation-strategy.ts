import type { GeneratedQuiz } from "../../schemas/generation.schema.js";
import type { JsonResponseFormat } from "../llm/openrouter-client.js";

/**
 * Turns Markdown source text into a validated quiz, asking the LLM to
 * reply in `responseFormat`. Left as an interface
 * (STRAT-01) so a second strategy is addable later without touching
 * callers; only `DefaultGenerationStrategy` is implemented for MVP.
 */
export interface QuestionGenerationStrategy {
  generate(markdown: string, responseFormat: JsonResponseFormat): Promise<GeneratedQuiz>;
}
