import type { FastifyInstance } from "fastify";
import { CreateQuizRequestSchema, SubmitRequestSchema } from "../schemas/api.schema.js";
import type { AuthService } from "../services/auth/auth.service.js";
import { createAuthHook } from "../plugins/auth-hook.js";
import { withRequestTraceContext } from "../observability/request-trace-context.js";
import type { QuizService } from "../services/quiz/quiz.service.js";

/** Registers the auth-protected `/api/quizzes*` routes. */
export function registerQuizRoutes(app: FastifyInstance, authService: AuthService, quizService: QuizService) {
  const onRequest = createAuthHook(authService);

  app.post("/api/quizzes", { onRequest }, async (request, reply) => {
    const body = CreateQuizRequestSchema.parse(request.body);
    const quiz = await withRequestTraceContext(request, () => quizService.createQuiz(body.sourceUrl));
    reply.status(201).send(quiz);
  });

  app.post<{ Params: { id: string } }>("/api/quizzes/:id/submit", { onRequest }, async (request, reply) => {
    const body = SubmitRequestSchema.parse(request.body);
    const result = await quizService.submitQuiz(request.params.id, body.answers);
    reply.status(200).send(result);
  });

  app.get<{ Params: { id: string } }>("/api/quizzes/:id", { onRequest }, async (request, reply) => {
    const detail = await quizService.getQuiz(request.params.id);
    reply.status(200).send(detail);
  });

  app.get("/api/quizzes", { onRequest }, async (_request, reply) => {
    const summaries = await quizService.listQuizzes();
    reply.status(200).send(summaries);
  });
}
