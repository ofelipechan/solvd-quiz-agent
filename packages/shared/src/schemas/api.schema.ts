import { z } from "zod";

/** Request body for `POST /api/auth/login`. */
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/** Request body for `POST /api/quizzes`. */
export const CreateQuizRequestSchema = z.object({
  sourceUrl: z.string().url(),
});
export type CreateQuizRequest = z.infer<typeof CreateQuizRequestSchema>;

/** One answered question in a submit payload: question id + selected option ids. */
export const AnswerInputSchema = z.object({
  questionId: z.string().uuid(),
  selectedOptionIds: z.array(z.string().uuid()),
});
export type AnswerInput = z.infer<typeof AnswerInputSchema>;

/** Request body for `POST /api/quizzes/:id/submit`. */
export const SubmitRequestSchema = z.object({
  answers: z.array(AnswerInputSchema),
});
export type SubmitRequest = z.infer<typeof SubmitRequestSchema>;

/** Per-question result returned after scoring. */
export const AnswerResultSchema = z.object({
  questionId: z.string().uuid(),
  correct: z.boolean(),
  score: z.number(),
});
export type AnswerResult = z.infer<typeof AnswerResultSchema>;

/** Response body for `POST /api/quizzes/:id/submit`. */
export const SubmitResponseSchema = z.object({
  answers: z.array(AnswerResultSchema),
  finalScore: z.number(),
});
export type SubmitResponse = z.infer<typeof SubmitResponseSchema>;
