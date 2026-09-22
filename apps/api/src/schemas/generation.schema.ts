import { z } from "zod";

export const GeneratedOptionSchema = z.object({
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

export const GeneratedQuestionSchema = z
  .object({
    text: z.string().min(1),
    questionType: z.enum(["single", "multiple"]),
    options: z.array(GeneratedOptionSchema).length(4),
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
  questions: z.array(GeneratedQuestionSchema).min(5).max(8),
});

export type GeneratedOption = z.infer<typeof GeneratedOptionSchema>;
export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;
export type GeneratedQuiz = z.infer<typeof GeneratedQuizSchema>;
