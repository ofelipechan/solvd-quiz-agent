import type { FastifyInstance } from "fastify";
import { CreateQuizRequestSchema } from "@quiz-agent/shared";
import type { AuthService } from "../services/auth/auth.service.js";
import { createAuthHook } from "../plugins/auth-hook.js";
import type { QuizService } from "../services/quiz/quiz.service.js";
import type { QuizWithQuestions } from "../repositories/quiz.repository.js";

/** Strips `isCorrect` from every option before the quiz reaches the client (GEN-07). */
function toPublicQuiz(quiz: QuizWithQuestions) {
  return {
    id: quiz.id,
    sourceUrl: quiz.sourceUrl,
    createdAt: quiz.createdAt,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      orderIndex: q.orderIndex,
      text: q.text,
      questionType: q.questionType,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
    })),
  };
}

/** Registers the auth-protected `/api/quizzes*` routes. */
export function registerQuizRoutes(app: FastifyInstance, authService: AuthService, quizService: QuizService) {
  const onRequest = createAuthHook(authService);

  app.post("/api/quizzes", { onRequest }, async (request, reply) => {
    const body = CreateQuizRequestSchema.parse(request.body);
    const quiz = await quizService.createQuiz(body.sourceUrl);
    reply.status(201).send(toPublicQuiz(quiz));
  });
}
