import { GeneratedQuizSchema, type GeneratedQuiz } from "@quiz-agent/shared";
import { AppError } from "../../app.js";
import type { OpenRouterClient } from "../llm/openrouter-client.js";
import type { QuestionGenerationStrategy } from "./generation-strategy.js";

/** Thrown when the LLM output still fails schema validation after one retry (GEN-06). */
export class GenerationFailedError extends AppError {
  constructor() {
    super("quiz generation failed", 502);
  }
}

function buildPrompt(markdown: string): string {
  return [
    "You are a quiz generator. Read the following Markdown document and produce a JSON object",
    'matching this shape: { "questions": [ { "text": string, "questionType": "single" | "multiple",',
    '"options": [ { "text": string, "isCorrect": boolean } ] (exactly 4 options) } ] } (5 to 8 questions).',
    "Pick \"single\" when exactly one option is correct, \"multiple\" when two or more are correct.",
    "Respond with JSON only, no prose.",
    "",
    "Document:",
    markdown,
  ].join("\n");
}

/**
 * Default (and only, for MVP) `QuestionGenerationStrategy`: prompts
 * OpenRouter for structured quiz JSON, Zod-validates it, and retries
 * exactly once on a schema failure before giving up (GEN-06).
 */
export class DefaultGenerationStrategy implements QuestionGenerationStrategy {
  constructor(private readonly client: OpenRouterClient) {}

  async generate(markdown: string): Promise<GeneratedQuiz> {
    const prompt = buildPrompt(markdown);

    const first = await this.client.chatJSON(prompt);
    const firstResult = GeneratedQuizSchema.safeParse(first);
    if (firstResult.success) {
      return firstResult.data;
    }

    const second = await this.client.chatJSON(prompt);
    const secondResult = GeneratedQuizSchema.safeParse(second);
    if (secondResult.success) {
      return secondResult.data;
    }

    throw new GenerationFailedError();
  }
}
