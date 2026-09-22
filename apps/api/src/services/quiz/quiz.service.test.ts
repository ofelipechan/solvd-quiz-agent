import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupInMemoryTracing, findSpan, isChildOf, readAttribute } from "../../observability/testing/in-memory-tracing.js";
import {
  DuplicateSubmissionError,
  InsufficientContentError,
  InvalidAnswerError,
  QuizNotFoundError,
} from "../../errors/quiz.errors.js";
import {
  QuizService,
  type MarkdownFetcherFn,
} from "./quiz.service.js";
import type { QuestionGenerationStrategy } from "./generation-strategy.js";
import type { QuizWithQuestions } from "../../models/quiz.model.js";
import type { QuizRepository } from "../../repositories/quiz.repository.js";

const tracing = setupInMemoryTracing();

/** Well over the 200-char insufficient-content floor, so the normal fetch->generate path runs. */
const sampleReadmeContent =
  "# Example Project\n\nThis is a substantial README with plenty of content to describe " +
  "the project, its features, installation steps, and usage examples in enough detail " +
  "for a quiz to be generated from it.";

const generatedQuiz = {
  questions: [
    {
      text: "q1",
      questionType: "single" as const,
      options: [
        { text: "a", isCorrect: true },
        { text: "b", isCorrect: false },
        { text: "c", isCorrect: false },
        { text: "d", isCorrect: false },
      ],
    },
  ],
};

const persistedQuiz: QuizWithQuestions = {
  id: "quiz-1",
  sourceUrl: "https://example.com/README.md",
  createdAt: new Date(),
  questions: [
    {
      id: "q1",
      orderIndex: 1,
      text: "q1",
      questionType: "single",
      weight: 100,
      options: [
        { id: "o1", text: "a", isCorrect: true },
        { id: "o2", text: "b", isCorrect: false },
        { id: "o3", text: "c", isCorrect: false },
        { id: "o4", text: "d", isCorrect: false },
      ],
    },
  ],
};

const twoQuestionQuiz: QuizWithQuestions = {
  id: "quiz-2",
  sourceUrl: "https://example.com/README.md",
  createdAt: new Date(),
  questions: [
    {
      id: "q1",
      orderIndex: 1,
      text: "single question",
      questionType: "single",
      weight: 20,
      options: [
        { id: "q1-a", text: "a", isCorrect: true },
        { id: "q1-b", text: "b", isCorrect: false },
        { id: "q1-c", text: "c", isCorrect: false },
        { id: "q1-d", text: "d", isCorrect: false },
      ],
    },
    {
      id: "q2",
      orderIndex: 2,
      text: "multiple question",
      questionType: "multiple",
      weight: 80,
      options: [
        { id: "q2-a", text: "a", isCorrect: true },
        { id: "q2-b", text: "b", isCorrect: true },
        { id: "q2-c", text: "c", isCorrect: false },
        { id: "q2-d", text: "d", isCorrect: false },
      ],
    },
  ],
};

function buildCollaborators() {
  const fetchMarkdown: MarkdownFetcherFn = vi
    .fn()
    .mockResolvedValue({ content: sampleReadmeContent, sourceUrl: "https://example.com/README.md" });
  const strategy: QuestionGenerationStrategy = { generate: vi.fn().mockResolvedValue(generatedQuiz) };
  const repository = {
    createQuizWithQuestions: vi.fn().mockResolvedValue({
      id: persistedQuiz.id,
      sourceUrl: persistedQuiz.sourceUrl,
      createdAt: persistedQuiz.createdAt,
    }),
    findQuizWithQuestions: vi.fn().mockResolvedValue(persistedQuiz),
    createSubmission: vi.fn().mockResolvedValue({
      id: "submission-1",
      quizId: persistedQuiz.id,
      finalScore: 0,
      submittedAt: new Date(),
    }),
  } as unknown as QuizRepository;

  return { fetchMarkdown, strategy, repository };
}

describe("QuizService", () => {
  describe("createQuiz()", () => {
    describe("given every step succeeds", () => {
      /**
       * A quiz is built in a fixed order and the persisted result is what the caller gets.
       * @scenario "a quiz is created by fetching, generating, then persisting"
       */
      it("fetches, generates, persists in order and hands back the stored quiz", async () => {
        const { fetchMarkdown, strategy, repository } = buildCollaborators();
        const calls: string[] = [];
        (fetchMarkdown as ReturnType<typeof vi.fn>).mockImplementation(async () => {
          calls.push("fetch");
          return { content: sampleReadmeContent, sourceUrl: "https://example.com/README.md" };
        });
        (strategy.generate as ReturnType<typeof vi.fn>).mockImplementation(async () => {
          calls.push("generate");
          return generatedQuiz;
        });
        (repository.createQuizWithQuestions as ReturnType<typeof vi.fn>).mockImplementation(async () => {
          calls.push("persist");
          return { id: persistedQuiz.id, sourceUrl: persistedQuiz.sourceUrl, createdAt: persistedQuiz.createdAt };
        });

        const service = new QuizService(fetchMarkdown, strategy, repository);
        const result = await service.createQuiz("https://example.com/README.md");

        expect(calls).toEqual(["fetch", "generate", "persist"]);
        expect(result).toEqual(persistedQuiz);
      });

      /**
       * Weights are assigned before persisting, as an equal split that adds up to 100.
       * @scenario "every generated question is persisted with an equal-split weight"
       */
      it("persists 3 questions weighing 33.33, 33.33 and 33.34", async () => {
        const { fetchMarkdown, strategy, repository } = buildCollaborators();
        const question = generatedQuiz.questions[0];
        (strategy.generate as ReturnType<typeof vi.fn>).mockResolvedValue({
          questions: [question, { ...question, text: "q2" }, { ...question, text: "q3" }],
        });

        const service = new QuizService(fetchMarkdown, strategy, repository);
        await service.createQuiz("https://example.com/README.md");

        const persisted = (repository.createQuizWithQuestions as ReturnType<typeof vi.fn>).mock.calls[0][0];
        const weights = persisted.questions.map((q: { weight: number }) => q.weight);
        expect(weights).toEqual([33.33, 33.33, 33.34]);
        expect(weights.reduce((sum: number, w: number) => sum + w, 0)).toBeCloseTo(100, 10);
      });
    });

    describe("given fetching the source fails", () => {
      /**
       * Nothing downstream runs when the source cannot be fetched.
       * @scenario "a fetch failure stops the flow before generation"
       */
      it("surfaces the failure and generates and persists nothing", async () => {
        const { fetchMarkdown, strategy, repository } = buildCollaborators();
        const fetchError = new Error("fetch failed");
        (fetchMarkdown as ReturnType<typeof vi.fn>).mockRejectedValue(fetchError);

        const service = new QuizService(fetchMarkdown, strategy, repository);

        await expect(service.createQuiz("https://example.com/README.md")).rejects.toBe(fetchError);
        expect(strategy.generate).not.toHaveBeenCalled();
        expect(repository.createQuizWithQuestions).not.toHaveBeenCalled();
      });
    });

    describe("given question generation fails", () => {
      /**
       * A partial quiz is never persisted.
       * @scenario "a generation failure stops the flow before persistence"
       */
      it("surfaces the failure and persists nothing", async () => {
        const { fetchMarkdown, strategy, repository } = buildCollaborators();
        const generationError = new Error("generation failed");
        (strategy.generate as ReturnType<typeof vi.fn>).mockRejectedValue(generationError);

        const service = new QuizService(fetchMarkdown, strategy, repository);

        await expect(service.createQuiz("https://example.com/README.md")).rejects.toBe(generationError);
        expect(repository.createQuizWithQuestions).not.toHaveBeenCalled();
      });
    });

    describe("given the source is shorter than 200 characters", () => {
      /**
       * Content too thin to yield 5 questions is refused before the LLM is asked.
       * @scenario "a source under 200 characters is rejected as insufficient content"
       */
      it("rejects as insufficient content without generating or persisting", async () => {
        const { fetchMarkdown, strategy, repository } = buildCollaborators();
        (fetchMarkdown as ReturnType<typeof vi.fn>).mockResolvedValue({
          content: "too short",
          sourceUrl: "https://example.com/README.md",
        });

        const service = new QuizService(fetchMarkdown, strategy, repository);

        await expect(service.createQuiz("https://example.com/README.md")).rejects.toBeInstanceOf(
          InsufficientContentError,
        );
        expect(strategy.generate).not.toHaveBeenCalled();
        expect(repository.createQuizWithQuestions).not.toHaveBeenCalled();

        let caught: unknown;
        try {
          await service.createQuiz("https://example.com/README.md");
        } catch (e) {
          caught = e;
        }
        expect((caught as InsufficientContentError).statusCode).toBe(422);
      });
    });

    describe("tracing", () => {
      const sourceUrl = "https://example.com/README.md";

      beforeEach(() => tracing.reset());

      async function createQuiz(overrides: Partial<ReturnType<typeof buildCollaborators>> = {}) {
        const collaborators = { ...buildCollaborators(), ...overrides };
        const service = new QuizService(collaborators.fetchMarkdown, collaborators.strategy, collaborators.repository);
        await service.createQuiz(sourceUrl).catch(() => undefined);
        return tracing.spans();
      }

      /**
       * One quiz creation is one trace.
       * @scenario "a quiz creation is one trace rooted in create-quiz"
       */
      it("traces a root create-quiz", async () => {
        const root = findSpan(await createQuiz(), "create-quiz");

        expect(root.parentSpanContext).toBeUndefined();
      });

      /**
       * The trace input is what a reviewer needs at a glance.
       * @scenario "the root input is the source URL"
       */
      it("traces the source address as root input", async () => {
        const root = findSpan(await createQuiz(), "create-quiz");

        expect(readAttribute(root, "langfuse.observation.input")).toEqual({ sourceUrl });
      });

      /**
       * The trace output identifies the persisted quiz and its size.
       * @scenario "the root output identifies the quiz and its size"
       */
      it("traces the quiz id and question count as root output", async () => {
        const root = findSpan(await createQuiz(), "create-quiz");

        expect(readAttribute(root, "langfuse.observation.output")).toEqual({ quizId: "quiz-1", questionCount: 1 });
      });

      /**
       * Fetching is a lookup that changes no state.
       * @scenario "fetching the source is traced as a retriever"
       */
      it("traces fetching as a retriever", async () => {
        const fetch = findSpan(await createQuiz(), "fetch-source");

        expect(readAttribute(fetch, "langfuse.observation.type")).toBe("retriever");
      });

      /**
       * The retriever reports size, not the document itself.
       * @scenario "the retriever reports what was fetched and how much"
       */
      it("traces the address and size as fetch output", async () => {
        const fetch = findSpan(await createQuiz(), "fetch-source");

        expect(readAttribute(fetch, "langfuse.observation.output")).toEqual({
          sourceUrl,
          contentLength: sampleReadmeContent.length,
        });
      });

      /**
       * Slow database writes are visible as their own step.
       * @scenario "persisting is traced as its own step"
       */
      it("traces the quiz id as persist output", async () => {
        const persist = findSpan(await createQuiz(), "persist-quiz");

        expect(readAttribute(persist, "langfuse.observation.output")).toEqual({ quizId: "quiz-1" });
      });

      /**
       * The tree reads fetch -> generate -> persist under one root.
       * @scenario "fetch and persist steps nest under the root"
       */
      it("nests fetch and persist under the root", async () => {
        const spans = await createQuiz();
        const root = findSpan(spans, "create-quiz");

        expect([isChildOf(findSpan(spans, "fetch-source"), root), isChildOf(findSpan(spans, "persist-quiz"), root)]).toEqual([
          true,
          true,
        ]);
      });

      /**
       * A failed fetch is an errored trace carrying the reason.
       * @scenario "a fetch failure marks the root as errored with the reason"
       */
      it("traces the root as errored with the fetch reason", async () => {
        const fetchMarkdown: MarkdownFetcherFn = vi.fn().mockRejectedValue(new Error("fetch failed"));
        const root = findSpan(await createQuiz({ fetchMarkdown }), "create-quiz");

        expect(root.status).toEqual({ code: 2, message: "fetch failed" });
      });

      /**
       * Steps that never ran leave no observations, showing where the flow stopped.
       * @scenario "a generation failure leaves no persist step in the trace"
       */
      it("traces no persist step", async () => {
        const strategy: QuestionGenerationStrategy = { generate: vi.fn().mockRejectedValue(new Error("generation failed")) };
        const spans = await createQuiz({ strategy });

        expect(spans.some((s) => s.name === "persist-quiz")).toBe(false);
      });

      /**
       * Rejecting a too-short source is an errored trace, not a silent gap.
       * @scenario "insufficient content marks the root as errored"
       */
      it("traces the root as errored", async () => {
        const fetchMarkdown: MarkdownFetcherFn = vi.fn().mockResolvedValue({ content: "too short", sourceUrl });
        const root = findSpan(await createQuiz({ fetchMarkdown }), "create-quiz");

        expect(root.status.code).toBe(2);
      });
    });
  });

  describe("getQuizForSubmission()", () => {
    /**
     * Scoring needs the full tree including correctness.
     * @scenario "a quiz loaded for scoring carries its full question tree"
     */
    it("hands back the quiz with correctness", async () => {
      const { fetchMarkdown, strategy, repository } = buildCollaborators();
      const service = new QuizService(fetchMarkdown, strategy, repository);

      const result = await service.getQuizForSubmission("quiz-1");

      expect(result).toEqual(persistedQuiz);
    });

    /**
     * An unknown quiz cannot be scored.
     * @scenario "loading an unknown quiz for scoring is rejected as not found"
     */
    it("rejects an unknown quiz as not found", async () => {
      const { fetchMarkdown, strategy, repository } = buildCollaborators();
      (repository.findQuizWithQuestions as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const service = new QuizService(fetchMarkdown, strategy, repository);

      await expect(service.getQuizForSubmission("missing")).rejects.toBeInstanceOf(QuizNotFoundError);
    });
  });

  describe("submitQuiz()", () => {
    function buildSubmitService() {
      const { fetchMarkdown, strategy, repository } = buildCollaborators();
      (repository.findQuizWithQuestions as ReturnType<typeof vi.fn>).mockResolvedValue(twoQuestionQuiz);
      const service = new QuizService(fetchMarkdown, strategy, repository);
      return { service, repository };
    }

    describe("given a quiz with a single and a multiple question", () => {
      /**
       * Every question scored 4 keeps the weighted average at 4.
       * @scenario "a fully correct submission scores 4 on every question and overall"
       */
      it("scores every answer 4 and the quiz 4", async () => {
        const { service } = buildSubmitService();

        const result = await service.submitQuiz("quiz-2", [
          { questionId: "q1", selectedOptionIds: ["q1-a"] },
          { questionId: "q2", selectedOptionIds: ["q2-a", "q2-b"] },
        ]);

        expect(result.answers).toEqual([
          { questionId: "q1", correct: true, score: 4, weight: 20, correctOptionIds: ["q1-a"] },
          { questionId: "q2", correct: true, score: 4, weight: 80, correctOptionIds: ["q2-a", "q2-b"] },
        ]);
        expect(result.finalScore).toBe(4);
      });

      /**
       * The stored weights, not the question order, decide how much each answer counts.
       * @scenario "the final score honours the stored question weights"
       */
      it("scores 0.8 when only the 20-weight question is right", async () => {
        const { service } = buildSubmitService();

        const result = await service.submitQuiz("quiz-2", [{ questionId: "q1", selectedOptionIds: ["q1-a"] }]);

        expect(result.finalScore).toBeCloseTo(0.8, 10);
      });

      /**
       * The review needs each question's weight to explain the final score.
       * @scenario "each answer reports the weight of its question"
       */
      it("carries the stored weight on every answer", async () => {
        const { service } = buildSubmitService();

        const result = await service.submitQuiz("quiz-2", [
          { questionId: "q1", selectedOptionIds: ["q1-b"] },
          { questionId: "q2", selectedOptionIds: ["q2-a"] },
        ]);

        expect(result.answers.map((a) => a.weight)).toEqual([20, 80]);
      });

      /**
       * A missing answer is scored 0 rather than rejecting the whole submission.
       * @scenario "a question left unanswered scores 0"
       */
      it("scores the unanswered question 0", async () => {
        const { service } = buildSubmitService();

        const result = await service.submitQuiz("quiz-2", [{ questionId: "q1", selectedOptionIds: ["q1-a"] }]);

        expect(result.answers).toEqual([
          { questionId: "q1", correct: true, score: 4, weight: 20, correctOptionIds: ["q1-a"] },
          { questionId: "q2", correct: false, score: 0, weight: 80, correctOptionIds: ["q2-a", "q2-b"] },
        ]);
      });

      /**
       * An option must belong to the question it answers.
       * @scenario "an option from another question is rejected as an invalid answer"
       */
      it("rejects an option from another question as invalid", async () => {
        const { service } = buildSubmitService();

        await expect(
          service.submitQuiz("quiz-2", [{ questionId: "q1", selectedOptionIds: ["q2-a"] }]),
        ).rejects.toBeInstanceOf(InvalidAnswerError);
      });
    });

    describe("given the quiz was already submitted", () => {
      /**
       * A quiz is scored once; the store's refusal is surfaced as a duplicate.
       * @scenario "a repeated submission is rejected as a duplicate"
       */
      it("rejects as a duplicate submission", async () => {
        const { service, repository } = buildSubmitService();
        (repository.createSubmission as ReturnType<typeof vi.fn>).mockRejectedValue(
          new DuplicateSubmissionError(),
        );

        await expect(
          service.submitQuiz("quiz-2", [{ questionId: "q1", selectedOptionIds: ["q1-a"] }]),
        ).rejects.toBeInstanceOf(DuplicateSubmissionError);
      });
    });

    describe("given the quiz does not exist", () => {
      /**
       * Answers cannot be scored against a missing quiz.
       * @scenario "submitting to a quiz that does not exist is rejected as not found"
       */
      it("rejects as not found", async () => {
        const { service, repository } = buildSubmitService();
        (repository.findQuizWithQuestions as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        await expect(service.submitQuiz("missing", [])).rejects.toBeInstanceOf(QuizNotFoundError);
      });
    });
  });

  describe("getQuiz()", () => {
    const submission = {
      id: "submission-1",
      quizId: persistedQuiz.id,
      finalScore: 4,
      submittedAt: new Date("2026-02-01T00:00:00Z"),
      answers: [{ questionId: "q1", selectedOptionIds: ["o1"], score: 4 }],
    };

    describe("given the quiz has no submission", () => {
      /**
       * Before submitting, correctness stays hidden and no submission block exists.
       * @scenario "an unsubmitted quiz detail hides correctness and has no submission"
       */
      it("hands back the detail with no submission and no correctness", async () => {
        const { fetchMarkdown, strategy, repository } = buildCollaborators();
        (repository as unknown as { findSubmissionWithAnswers: ReturnType<typeof vi.fn> }).findSubmissionWithAnswers =
          vi.fn().mockResolvedValue(null);

        const service = new QuizService(fetchMarkdown, strategy, repository);
        const detail = await service.getQuiz(persistedQuiz.id);

        expect(detail.id).toBe(persistedQuiz.id);
        expect(detail.submission).toBeNull();
        expect(detail.questions[0].options.every((o) => !("isCorrect" in o))).toBe(true);
      });
    });

    describe("given the quiz has a submission", () => {
      /**
       * The submission block is the only place correct option ids are revealed.
       * @scenario "a submitted quiz detail reveals per-question correctness in the submission"
       */
      it("hands back the submission with correctness and hides it elsewhere", async () => {
        const { fetchMarkdown, strategy, repository } = buildCollaborators();
        (repository as unknown as { findSubmissionWithAnswers: ReturnType<typeof vi.fn> }).findSubmissionWithAnswers =
          vi.fn().mockResolvedValue(submission);

        const service = new QuizService(fetchMarkdown, strategy, repository);
        const detail = await service.getQuiz(persistedQuiz.id);

        expect(detail.submission).toEqual({
          finalScore: 4,
          submittedAt: submission.submittedAt,
          answers: [
            { questionId: "q1", selectedOptionIds: ["o1"], score: 4, weight: 100, correct: true, correctOptionIds: ["o1"] },
          ],
        });
        expect(detail.questions[0].options.every((o) => !("isCorrect" in o))).toBe(true);
      });
    });

    describe("given the quiz does not exist", () => {
      /**
       * An unknown quiz has no detail to show.
       * @scenario "loading the detail of an unknown quiz is rejected as not found"
       */
      it("rejects as not found", async () => {
        const { fetchMarkdown, strategy, repository } = buildCollaborators();
        (repository.findQuizWithQuestions as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        const service = new QuizService(fetchMarkdown, strategy, repository);

        await expect(service.getQuiz("missing")).rejects.toBeInstanceOf(QuizNotFoundError);
      });
    });
  });
});
