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
import { QuizNotFoundError, InvalidAnswerError } from "../services/quiz/quiz.service.js";
import { DuplicateSubmissionError } from "../repositories/quiz.repository.js";
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

describe("POST /api/quizzes/:id/submit", () => {
  const QUESTION_ID = "11111111-1111-1111-1111-111111111111";
  const OPTION_ID = "22222222-2222-2222-2222-222222222222";
  const submitPayload = { answers: [{ questionId: QUESTION_ID, selectedOptionIds: [OPTION_ID] }] };

  /** Spec AC (SCORE-01/SCORE-03): valid submission returns 200 with per-question correctness + final score. */
  it("returns 200 with the score payload on a valid submission", async () => {
    const { app, authService } = buildTestApp({
      submitQuiz: async () => ({
        answers: [{ questionId: QUESTION_ID, correct: true, score: 4 }],
        finalScore: 4,
      }),
    });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/quizzes/quiz-1/submit",
      cookies: { [AUTH_COOKIE_NAME]: validCookie(authService) },
      payload: submitPayload,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.finalScore).toBe(4);
    expect(body.answers).toEqual([{ questionId: QUESTION_ID, correct: true, score: 4 }]);
  });

  /** Spec AC (SCORE-05): unknown quiz id returns 404. */
  it("returns 404 for an unknown quiz id", async () => {
    const { app, authService } = buildTestApp({
      submitQuiz: async () => {
        throw new QuizNotFoundError();
      },
    });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/quizzes/missing/submit",
      cookies: { [AUTH_COOKIE_NAME]: validCookie(authService) },
      payload: submitPayload,
    });

    expect(res.statusCode).toBe(404);
  });

  /** Edge case: a submitted option id that doesn't belong to its question returns 400. */
  it("returns 400 for a mismatched option id", async () => {
    const { app, authService } = buildTestApp({
      submitQuiz: async () => {
        throw new InvalidAnswerError();
      },
    });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/quizzes/quiz-1/submit",
      cookies: { [AUTH_COOKIE_NAME]: validCookie(authService) },
      payload: submitPayload,
    });

    expect(res.statusCode).toBe(400);
  });

  /** Spec AC (SCORE-06): resubmitting an already-submitted quiz returns 409. */
  it("returns 409 on resubmission", async () => {
    const { app, authService } = buildTestApp({
      submitQuiz: async () => {
        throw new DuplicateSubmissionError();
      },
    });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/quizzes/quiz-1/submit",
      cookies: { [AUTH_COOKIE_NAME]: validCookie(authService) },
      payload: submitPayload,
    });

    expect(res.statusCode).toBe(409);
  });

  /** Spec AC (AUTH-03): no auth cookie returns 401 and never calls the service. */
  it("returns 401 with no auth cookie", async () => {
    let called = false;
    const { app } = buildTestApp({
      submitQuiz: async () => {
        called = true;
        return { answers: [], finalScore: 0 };
      },
    });
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/quizzes/quiz-1/submit",
      payload: submitPayload,
    });

    expect(res.statusCode).toBe(401);
    expect(called).toBe(false);
  });
});
