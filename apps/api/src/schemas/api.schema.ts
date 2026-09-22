import { z } from "zod";

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const CreateQuizRequestSchema = z.object({
  sourceUrl: z.string().url(),
});
export type CreateQuizRequest = z.infer<typeof CreateQuizRequestSchema>;

export const AnswerInputSchema = z.object({
  questionId: z.string().uuid(),
  selectedOptionIds: z.array(z.string().uuid()),
});
export type AnswerInput = z.infer<typeof AnswerInputSchema>;

export const SubmitRequestSchema = z.object({
  answers: z.array(AnswerInputSchema),
});
export type SubmitRequest = z.infer<typeof SubmitRequestSchema>;

export const AnswerResultSchema = z.object({
  questionId: z.string().uuid(),
  correct: z.boolean(),
  score: z.number(),
  correctOptionIds: z.array(z.string().uuid()),
});
export type AnswerResult = z.infer<typeof AnswerResultSchema>;

export const SubmitResponseSchema = z.object({
  answers: z.array(AnswerResultSchema),
  finalScore: z.number(),
});
export type SubmitResponse = z.infer<typeof SubmitResponseSchema>;

export const PublicOptionSchema = z.object({
  id: z.string().uuid(),
  text: z.string(),
});
export type PublicOption = z.infer<typeof PublicOptionSchema>;

export const PublicQuestionSchema = z.object({
  id: z.string().uuid(),
  orderIndex: z.number().int(),
  text: z.string(),
  questionType: z.enum(["single", "multiple"]),
  options: z.array(PublicOptionSchema),
});
export type PublicQuestion = z.infer<typeof PublicQuestionSchema>;

export const SubmittedAnswerSchema = AnswerResultSchema.extend({
  selectedOptionIds: z.array(z.string().uuid()),
});
export type SubmittedAnswer = z.infer<typeof SubmittedAnswerSchema>;

export const QuizSubmissionSchema = z.object({
  finalScore: z.number(),
  submittedAt: z.string(),
  answers: z.array(SubmittedAnswerSchema),
});
export type QuizSubmission = z.infer<typeof QuizSubmissionSchema>;

export const QuizDetailResponseSchema = z.object({
  id: z.string().uuid(),
  sourceUrl: z.string(),
  createdAt: z.string(),
  questions: z.array(PublicQuestionSchema),
  submission: QuizSubmissionSchema.nullable(),
});
export type QuizDetailResponse = z.infer<typeof QuizDetailResponseSchema>;
