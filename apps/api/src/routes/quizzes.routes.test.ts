import { describe, it, expect, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { buildApp } from "../app.js";
import { registerQuizRoutes } from "./quizzes.routes.js";
import { AUTH_COOKIE_NAME } from "../plugins/auth-hook.js";
import { AuthService } from "../services/auth/auth.service.js";
import type { UserRepository } from "../repositories/user.repository.js";
import type { QuizService } from "../services/quiz/quiz.service.js";
import { SourceFetchError } from "../services/markdown/markdown-fetcher.js";
import { GenerationFailedError } from "../services/quiz/default-generation.strategy.js";
import type { QuizWithQuestions } from "../repositories/quiz.repository.js";

const JWT_SECRET = "test-secret";

function fakeAuthService(): AuthService {
  return new AuthService({} as UserRepository, JWT_SECRET);
}

function validCookie(authService: AuthService) {
  return jwt.sign({ userId: "u1" }, JWT_SECRET, { expiresIn: "24h" });
}

const persistedQuiz: QuizWithQuestions = {
  id: "quiz-1",
  sourceUrl: "https://example.com/README.md",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  questions: [
    {
      id: "q1",
      orderIndex: 1,
      text: "What is 2+2?",
      questionType: "single",
      options: [
        { id: "o1", text: "3", isCorrect: false },
        { id: "o2", text: "4", isCorrect: true },
      ],
    },
  ],
};

function buildTestApp(quizService: Partial<QuizService>) {
  const authService = fakeAuthService();
  const app = buildApp();
  registerQuizRoutes(app, authService, quizService as QuizService);
  return { app, authService };
}

describe("POST /api/quizzes", () => {
  /** Spec AC (GEN-01/GEN-07): success returns 201 with questions/options but no isCorrect flags. */
  it("returns 201 with generated questions and no isCorrect field on success", async () => {
    const { app, authService } = buildTestApp({
      createQuiz: async () => persistedQuiz,
    });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/quizzes",
      cookies: { [AUTH_COOKIE_NAME]: validCookie(authService) },
      payload: { sourceUrl: "https://example.com/README.md" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.questions[0].options[0]).not.toHaveProperty("isCorrect");
    expect(body.questions[0].options[1]).not.toHaveProperty("isCorrect");
  });

  /** Spec AC (GEN-03): source fetch failure maps to 422. */
  it("returns 422 when the source fetch fails", async () => {
    const { app, authService } = buildTestApp({
      createQuiz: async () => {
        throw new SourceFetchError("unreachable", "failed to fetch source: boom");
      },
    });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/quizzes",
      cookies: { [AUTH_COOKIE_NAME]: validCookie(authService) },
      payload: { sourceUrl: "https://example.com/README.md" },
    });

    expect(res.statusCode).toBe(422);
  });

  /** Spec AC (GEN-03): oversized source content maps to 422. */
  it("returns 422 when the source exceeds the size limit", async () => {
    const { app, authService } = buildTestApp({
      createQuiz: async () => {
        throw new SourceFetchError("too_large", "source content exceeds 200KB limit");
      },
    });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/quizzes",
      cookies: { [AUTH_COOKIE_NAME]: validCookie(authService) },
      payload: { sourceUrl: "https://example.com/README.md" },
    });

    expect(res.statusCode).toBe(422);
  });

  /** Spec AC (GEN-06): generation failure maps to 502. */
  it("returns 502 when generation fails", async () => {
    const { app, authService } = buildTestApp({
      createQuiz: async () => {
        throw new GenerationFailedError();
      },
    });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/quizzes",
      cookies: { [AUTH_COOKIE_NAME]: validCookie(authService) },
      payload: { sourceUrl: "https://example.com/README.md" },
    });

    expect(res.statusCode).toBe(502);
  });

  /** Spec AC (AUTH-03): no auth cookie returns 401 and never calls the service. */
  it("returns 401 with no auth cookie", async () => {
    let called = false;
    const { app } = buildTestApp({
      createQuiz: async () => {
        called = true;
        return persistedQuiz;
      },
    });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/quizzes",
      payload: { sourceUrl: "https://example.com/README.md" },
    });

    expect(res.statusCode).toBe(401);
    expect(called).toBe(false);
  });
});
