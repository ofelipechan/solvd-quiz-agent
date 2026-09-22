import { z } from "zod";
import type { ChatFormatJsonSchemaConfig } from "@openrouter/sdk/models";

export const GeneratedOptionSchema = z.object({
  text: z.string().min(1).describe("The option text"),
  isCorrect: z.boolean().describe("Whether this option is a correct answer"),
});

export const GeneratedQuestionSchema = z
  .object({
    text: z.string().min(1).describe("The question statement"),
    questionType: z
      .enum(["single", "multiple"])
      .describe("single when exactly one option is correct, multiple when two or more are"),
    options: z.array(GeneratedOptionSchema).length(4).describe("Exactly 4 answer options"),
  })
  .refine((question) => question.options.some((option) => option.isCorrect), {
    message: "at least one correct option",
  })
  .refine(
    (question) =>
      question.questionType === "single"
        ? question.options.filter((option) => option.isCorrect).length === 1
        : question.options.filter((option) => option.isCorrect).length >= 2,
    { message: "type/correct-count mismatch" },
  )
  .refine(
    (question) => new Set(question.options.map((option) => option.text)).size === question.options.length,
    { message: "option text must be unique within a question" },
  );

export const GeneratedQuizSchema = z.object({
  questions: z.array(GeneratedQuestionSchema).min(5).max(8).describe("The quiz questions, 5 to 8 of them"),
});

/**
 * `GeneratedQuizSchema` as an OpenRouter structured-outputs response format
 * (https://openrouter.ai/docs/guides/features/structured-outputs). Zod emits
 * `additionalProperties: false` and lists every property as `required`, which
 * `strict` demands; refinements are not expressible in JSON Schema and stay
 * enforced by `safeParse` on the reply.
 */
export const GENERATED_QUIZ_RESPONSE_FORMAT: ChatFormatJsonSchemaConfig = {
  type: "json_schema",
  jsonSchema: {
    name: "generated_quiz",
    strict: true,
    schema: z.toJSONSchema(GeneratedQuizSchema),
  },
};

export type GeneratedOption = z.infer<typeof GeneratedOptionSchema>;
export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;
export type GeneratedQuiz = z.infer<typeof GeneratedQuizSchema>;
