import type { GeneratedQuiz } from "@quiz-agent/shared";

/**
 * Turns Markdown source text into a validated quiz. Left as an interface
 * (STRAT-01) so a second strategy is addable later without touching
 * callers; only `DefaultGenerationStrategy` is implemented for MVP.
 */
export interface QuestionGenerationStrategy {
  generate(markdown: string): Promise<GeneratedQuiz>;
}
