import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { buildApp } from "../app.js";
import { SourceFetchError } from "../errors/source-fetch.error.js";
import {
  DuplicateSubmissionError,
  GenerationFailedError,
  InvalidAnswerError,
  QuizNotFoundError,
} from "../errors/quiz.errors.js";
import { registerQuizRoutes } from "./quizzes.routes.js";
import { AUTH_COOKIE_NAME } from "../plugins/auth-hook.js";
import { AuthService } from "../services/auth/auth.service.js";
import type { UserRepository } from "../repositories/user.repository.js";
import type { QuizService } from "../services/quiz/quiz.service.js";
import type { QuizWithQuestions } from "../models/quiz.model.js";

const JWT_SECRET = "test-secret";
process.env.JWT_SECRET = JWT_SECRET;

function fakeAuthService(): AuthService {
  return new AuthService({} as UserRepository);
}

function validCookie() {
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
      weight: 100,
      options: [
        { id: "o1", text: "3" },
        { id: "o2", text: "4" },
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
  const payload = { sourceUrl: "https://example.com/README.md" };

  describe("given a valid session", () => {
    /**
     * A created quiz never leaks which options are correct.
     * @scenario "a created quiz is returned with its questions but without the answers"
     */
    it("creates the quiz without revealing correct options", async () => {
      const { app } = buildTestApp({
        createQuiz: async () => persistedQuiz,
      });
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/quizzes",
        cookies: { [AUTH_COOKIE_NAME]: validCookie() },
        payload,
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.questions[0].weight).toBe(100);
      expect(body.questions[0].options[0]).not.toHaveProperty("isCorrect");
      expect(body.questions[0].options[1]).not.toHaveProperty("isCorrect");
      expect(body.questions[0].options[0]).not.toHaveProperty("feedback");
      expect(body.questions[0].options[1]).not.toHaveProperty("feedback");
    });

    /**
     * An unreachable source is the caller's problem, not a server fault.
     * @scenario "quiz creation is rejected when the source cannot be fetched"
     */
    it("rejects the request when the source cannot be fetched", async () => {
      const { app } = buildTestApp({
        createQuiz: async () => {
          throw new SourceFetchError("unreachable", "failed to fetch source: boom");
        },
      });
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/quizzes",
        cookies: { [AUTH_COOKIE_NAME]: validCookie() },
        payload,
      });

      expect(res.statusCode).toBe(422);
    });

    /**
     * An oversized source is refused as unprocessable.
     * @scenario "quiz creation is rejected when the source is too large"
     */
    it("rejects the request when the source is too large", async () => {
      const { app } = buildTestApp({
        createQuiz: async () => {
          throw new SourceFetchError("too_large", "source content exceeds 200KB limit");
        },
      });
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/quizzes",
        cookies: { [AUTH_COOKIE_NAME]: validCookie() },
        payload,
      });

      expect(res.statusCode).toBe(422);
    });

    /**
     * A failed generation is an upstream failure.
     * @scenario "quiz creation fails when question generation fails"
     */
    it("fails the request when generation fails", async () => {
      const { app } = buildTestApp({
        createQuiz: async () => {
          throw new GenerationFailedError();
        },
      });
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/quizzes",
        cookies: { [AUTH_COOKIE_NAME]: validCookie() },
        payload,
      });

      expect(res.statusCode).toBe(502);
    });
  });

  describe("given no session", () => {
    /**
     * Anonymous callers cannot trigger generation.
     * @scenario "quiz creation without a session is rejected"
     */
    it("is rejected as unauthenticated and nothing runs", async () => {
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
        payload,
      });

      expect(res.statusCode).toBe(401);
      expect(called).toBe(false);
    });
  });
});

describe("GET /api/quizzes", () => {
  describe("given a valid session", () => {
    /**
     * The history lists every quiz with its score, or none when unsubmitted.
     * @scenario "the list shows each quiz with its score or no score yet"
     */
    it("lists every quiz with its final score", async () => {
      const { app } = buildTestApp({
        listQuizzes: async () => [
          { id: "quiz-1", sourceUrl: "https://example.com/a.md", createdAt: new Date("2026-01-01"), finalScore: 3.5 },
          { id: "quiz-2", sourceUrl: "https://example.com/b.md", createdAt: new Date("2026-01-02"), finalScore: null },
        ],
      });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/quizzes",
        cookies: { [AUTH_COOKIE_NAME]: validCookie() },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body).toHaveLength(2);
      expect(body[0].finalScore).toBe(3.5);
      expect(body[1].finalScore).toBeNull();
    });
  });

  describe("given no session", () => {
    /**
     * History is private to the signed-in admin.
     * @scenario "listing quizzes without a session is rejected"
     */
    it("is rejected as unauthenticated", async () => {
      const { app } = buildTestApp({ listQuizzes: async () => [] });
      await app.ready();

      const res = await app.inject({ method: "GET", url: "/api/quizzes" });

      expect(res.statusCode).toBe(401);
    });
  });
});

describe("POST /api/quizzes/:id/submit", () => {
  const QUESTION_ID = "11111111-1111-4111-8111-111111111111";
  const OPTION_ID = "22222222-2222-4222-8222-222222222222";
  const submitPayload = { answers: [{ questionId: QUESTION_ID, selectedOptionIds: [OPTION_ID] }] };

  describe("given a valid session", () => {
    /**
     * The result carries per-question correctness and the final score.
     * @scenario "a valid submission returns the score and per-question correctness"
     */
    it("returns the final score and per-question answers", async () => {
      const { app } = buildTestApp({
        submitQuiz: async () => ({
          answers: [
            {
              questionId: QUESTION_ID,
              correct: true,
              score: 4,
              weight: 100,
              correctOptionIds: [OPTION_ID],
              selectedOptionFeedback: [{ optionId: OPTION_ID, feedback: "that is what the document says" }],
            },
          ],
          finalScore: 4,
        }),
      });
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/quizzes/quiz-1/submit",
        cookies: { [AUTH_COOKIE_NAME]: validCookie() },
        payload: submitPayload,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.finalScore).toBe(4);
      expect(body.answers).toEqual([
        {
          questionId: QUESTION_ID,
          correct: true,
          score: 4,
          weight: 100,
          correctOptionIds: [OPTION_ID],
          selectedOptionFeedback: [{ optionId: OPTION_ID, feedback: "that is what the document says" }],
        },
      ]);
    });

    /**
     * Answers to a missing quiz cannot be scored.
     * @scenario "submitting to an unknown quiz is rejected as not found"
     */
    it("is rejected as not found for an unknown quiz", async () => {
      const { app } = buildTestApp({
        submitQuiz: async () => {
          throw new QuizNotFoundError();
        },
      });
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/quizzes/missing/submit",
        cookies: { [AUTH_COOKIE_NAME]: validCookie() },
        payload: submitPayload,
      });

      expect(res.statusCode).toBe(404);
    });

    /**
     * An option must belong to the question it answers.
     * @scenario "an answer with an option from another question is rejected as invalid"
     */
    it("is rejected as invalid for a mismatched option", async () => {
      const { app } = buildTestApp({
        submitQuiz: async () => {
          throw new InvalidAnswerError();
        },
      });
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/quizzes/quiz-1/submit",
        cookies: { [AUTH_COOKIE_NAME]: validCookie() },
        payload: submitPayload,
      });

      expect(res.statusCode).toBe(400);
    });

    /**
     * A quiz is scored exactly once.
     * @scenario "a second submission for the same quiz is rejected as a duplicate"
     */
    it("is rejected as a duplicate on resubmission", async () => {
      const { app } = buildTestApp({
        submitQuiz: async () => {
          throw new DuplicateSubmissionError();
        },
      });
      await app.ready();

      const res = await app.inject({
        method: "POST",
        url: "/api/quizzes/quiz-1/submit",
        cookies: { [AUTH_COOKIE_NAME]: validCookie() },
        payload: submitPayload,
      });

      expect(res.statusCode).toBe(409);
    });
  });

  describe("given no session", () => {
    /**
     * Anonymous callers cannot score or persist a submission.
     * @scenario "submitting without a session is rejected"
     */
    it("is rejected as unauthenticated and nothing runs", async () => {
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
});

describe("GET /api/quizzes/:id", () => {
  const detail = {
    id: persistedQuiz.id,
    sourceUrl: persistedQuiz.sourceUrl,
    createdAt: persistedQuiz.createdAt,
    questions: persistedQuiz.questions.map((q) => ({
      ...q,
      options: q.options.map(({ id, text }) => ({ id, text })),
    })),
    submission: null,
  };

  describe("given a valid session", () => {
    /**
     * An unsubmitted quiz opens with its questions, no answers, no submission.
     * @scenario "an unsubmitted quiz opens with its questions and no submission"
     */
    it("returns the quiz detail", async () => {
      const { app } = buildTestApp({ getQuiz: async () => detail });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/quizzes/quiz-1",
        cookies: { [AUTH_COOKIE_NAME]: validCookie() },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe("quiz-1");
      expect(body.submission).toBeNull();
      expect(body.questions[0].options[0]).not.toHaveProperty("isCorrect");
      expect(body.questions[0].options[0]).not.toHaveProperty("feedback");
    });

    /**
     * An unknown quiz has nothing to open.
     * @scenario "opening an unknown quiz is rejected as not found"
     */
    it("is rejected as not found for an unknown quiz", async () => {
      const { app } = buildTestApp({
        getQuiz: async () => {
          throw new QuizNotFoundError();
        },
      });
      await app.ready();

      const res = await app.inject({
        method: "GET",
        url: "/api/quizzes/missing",
        cookies: { [AUTH_COOKIE_NAME]: validCookie() },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("given no session", () => {
    /**
     * Quiz detail is private to the signed-in admin.
     * @scenario "opening a quiz without a session is rejected"
     */
    it("is rejected as unauthenticated", async () => {
      const { app } = buildTestApp({ getQuiz: async () => detail });
      await app.ready();

      const res = await app.inject({ method: "GET", url: "/api/quizzes/quiz-1" });

      expect(res.statusCode).toBe(401);
    });
  });
});
