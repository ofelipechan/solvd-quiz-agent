import { GeneratedQuizSchema, type GeneratedQuiz } from "../../schemas/generation.schema.js";
import { startActiveObservation } from "@langfuse/tracing";
import type { z } from "zod";
import { GenerationFailedError } from "../../errors/quiz.errors.js";
import type { ChatMessage } from "../../models/chat.model.js";
import type { JsonResponseFormat, OpenRouterClient } from "../llm/openrouter-client.js";
import type { QuestionGenerationStrategy } from "./generation-strategy.js";

const SYSTEM_PROMPT = [
  "You are a quiz generator. You will be given a Markdown document. Your goal is to read the content",
  'of this markdown and help me build a set of questions based on that.',
  'Create between 5 and 8 questions. Some of them may have a single correct option. Pick a few to have multiple correct options.',
  "Set\"single\" when exactly one option is correct, and \"multiple\" when two or more are correct.",
  "Give every option a short feedback explaining why it is correct or why it is wrong,",
  "grounded in the document. Write it so it reads well on its own, after the quiz is submitted.",
  "Respond with JSON only, no prose.",
].join("\n");

const MAX_ATTEMPTS = 2;
/** Keeps trace metadata small when a reply violates the schema in many places. */
const MAX_REPORTED_ISSUES = 10;

function buildMessages(markdown: string): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: ["Document:", markdown].join("\n") },
  ];
}

/** Flattens Zod issues into short `path: message` strings for trace metadata. */
function summarizeIssues(issues: z.ZodIssue[]): string[] {
  return issues
    .slice(0, MAX_REPORTED_ISSUES)
    .map((issue) => `${issue.path.map(String).join(".") || "<root>"}: ${issue.message}`);
}

/**
 * Default (and only, for MVP) `QuestionGenerationStrategy`: prompts
 * OpenRouter for quiz JSON in the given response format, Zod-validates it, and retries
 * exactly once on a schema failure before giving up (GEN-06). The run is
 * traced as a Langfuse `chain` recording attempts and schema violations.
 */
export class DefaultGenerationStrategy implements QuestionGenerationStrategy {
  constructor(private readonly client: OpenRouterClient) {}

  async generate(markdown: string, responseFormat: JsonResponseFormat): Promise<GeneratedQuiz> {
    return startActiveObservation(
      "generate-questions",
      async (chain) => {
        chain.update({ input: { contentLength: markdown.length } });
        const messages = buildMessages(markdown);
        const validationIssues: string[] = [];

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          const result = GeneratedQuizSchema.safeParse(await this.client.chatJSON(messages, responseFormat));
          if (result.success) {
            const recovered = attempt > 1;
            chain.update({
              output: result.data,
              metadata: recovered ? { attempts: attempt, validationIssues } : { attempts: attempt },
              level: recovered ? "WARNING" : undefined,
              statusMessage: recovered ? "first reply failed schema validation; recovered on retry" : undefined,
            });
            return result.data;
          }
          validationIssues.push(...summarizeIssues(result.error.issues));
        }

        chain.update({ metadata: { attempts: MAX_ATTEMPTS, validationIssues } });
        throw new GenerationFailedError();
      },
      { asType: "chain" },
    );
  }
}
