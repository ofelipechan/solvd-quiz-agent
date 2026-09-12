import { z } from "zod";

/** One answer option as produced by the LLM before persistence. */
export const GeneratedOptionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

/**
 * One question as produced by the LLM: exactly 4 options, at least one
 * correct, correct-count matching `questionType`, and no duplicate option
 * text (SPEC_DEVIATION note below).
 */
export const GeneratedQuestionSchema = z
  .object({
    text: z.string().min(1),
    questionType: z.enum(["single", "multiple"]),
    options: z.array(GeneratedOptionSchema).length(4),
  })
  .refine((q) => q.options.filter((o) => o.isCorrect).length >= 1, {
    message: "at least one correct option",
  })
  .refine(
    (q) =>
      q.questionType === "single"
        ? q.options.filter((o) => o.isCorrect).length === 1
        : q.options.filter((o) => o.isCorrect).length >= 2,
    { message: "type/correct-count mismatch" },
  )
  // SPEC_DEVIATION: design's Risks table flags "LLM may return duplicate
  // option text" as a known gap and instructs adding a uniqueness refine
  // here during this task - not a deviation from spec, but from the literal
  // schema snippet quoted in design.md, which predates this fix.
  .refine((q) => new Set(q.options.map((o) => o.text)).size === q.options.length, {
    message: "option text must be unique within a question",
  });

/** Full LLM output contract: 5-8 questions. */
export const GeneratedQuizSchema = z.object({
  questions: z.array(GeneratedQuestionSchema).min(5).max(8),
});

export type GeneratedOption = z.infer<typeof GeneratedOptionSchema>;
export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;
export type GeneratedQuiz = z.infer<typeof GeneratedQuizSchema>;
