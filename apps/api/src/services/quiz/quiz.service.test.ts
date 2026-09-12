import { describe, it, expect, vi } from "vitest";
import {
  QuizService,
  QuizNotFoundError,
  InvalidAnswerError,
  InsufficientContentError,
  type MarkdownFetcherFn,
} from "./quiz.service.js";
import type { QuestionGenerationStrategy } from "./generation-strategy.js";
import {
  DuplicateSubmissionError,
  type QuizRepository,
  type QuizWithQuestions,
} from "../../repositories/quiz.repository.js";

/** Well over the 200-char insufficient-content floor, so existing tests exercise the normal fetch->generate path. */
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
      options: [
        { id: "o1", text: "a", isCorrect: true },
        { id: "o2", text: "b", isCorrect: false },
        { id: "o3", text: "c", isCorrect: false },
        { id: "o4", text: "d", isCorrect: false },
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

describe("QuizService.createQuiz", () => {
  /** GEN-01: happy path calls fetch, generate, then persist, in that order, and returns the persisted quiz. */
  it("calls fetch, generate, and persist in order and returns the persisted quiz", async () => {
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

  /** GEN-03/GEN-04: a fetch error propagates without calling generate or persist. */
  it("propagates a fetch error without calling generate or persist", async () => {
    const { fetchMarkdown, strategy, repository } = buildCollaborators();
    const fetchError = new Error("fetch failed");
    (fetchMarkdown as ReturnType<typeof vi.fn>).mockRejectedValue(fetchError);

    const service = new QuizService(fetchMarkdown, strategy, repository);

    await expect(service.createQuiz("https://example.com/README.md")).rejects.toBe(fetchError);
    expect(strategy.generate).not.toHaveBeenCalled();
    expect(repository.createQuizWithQuestions).not.toHaveBeenCalled();
  });

  /** GEN-06: a generation failure propagates without persisting a partial quiz. */
  it("propagates a generation error without persisting a partial quiz", async () => {
    const { fetchMarkdown, strategy, repository } = buildCollaborators();
    const generationError = new Error("generation failed");
    (strategy.generate as ReturnType<typeof vi.fn>).mockRejectedValue(generationError);

    const service = new QuizService(fetchMarkdown, strategy, repository);

    await expect(service.createQuiz("https://example.com/README.md")).rejects.toBe(generationError);
    expect(repository.createQuizWithQuestions).not.toHaveBeenCalled();
  });

  /** Edge case: source content too short to plausibly yield 5 questions throws InsufficientContentError (422) without calling generate. */
  it("throws InsufficientContentError for content under the minimum length, without calling generate", async () => {
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

describe("QuizService.getQuizForSubmission", () => {
  it("returns the quiz tree for an existing quiz id", async () => {
    const { fetchMarkdown, strategy, repository } = buildCollaborators();
    const service = new QuizService(fetchMarkdown, strategy, repository);

    const result = await service.getQuizForSubmission("quiz-1");

    expect(result).toEqual(persistedQuiz);
  });

  /** SCORE-05: a nonexistent quiz id throws QuizNotFoundError. */
  it("throws QuizNotFoundError for a nonexistent quiz id", async () => {
    const { fetchMarkdown, strategy, repository } = buildCollaborators();
    (repository.findQuizWithQuestions as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const service = new QuizService(fetchMarkdown, strategy, repository);

    await expect(service.getQuizForSubmission("missing")).rejects.toBeInstanceOf(QuizNotFoundError);
  });
});

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
      options: [
        { id: "q2-a", text: "a", isCorrect: true },
        { id: "q2-b", text: "b", isCorrect: true },
        { id: "q2-c", text: "c", isCorrect: false },
        { id: "q2-d", text: "d", isCorrect: false },
      ],
    },
  ],
};

describe("QuizService.submitQuiz", () => {
  function buildSubmitService() {
    const { fetchMarkdown, strategy, repository } = buildCollaborators();
    (repository.findQuizWithQuestions as ReturnType<typeof vi.fn>).mockResolvedValue(twoQuestionQuiz);
    const service = new QuizService(fetchMarkdown, strategy, repository);
    return { service, repository };
  }

  /** SCORE-01/02/03: a full valid submission scores each question correctly and returns the weighted final score. */
  it("scores a full valid submission and returns per-question correctness plus final score", async () => {
    const { service } = buildSubmitService();

    const result = await service.submitQuiz("quiz-2", [
      { questionId: "q1", selectedOptionIds: ["q1-a"] },
      { questionId: "q2", selectedOptionIds: ["q2-a", "q2-b"] },
    ]);

    expect(result.answers).toEqual([
      { questionId: "q1", correct: true, score: 4 },
      { questionId: "q2", correct: true, score: 4 },
    ]);
    // weight_1=1, weight_2=1.1 -> (4*1 + 4*1.1)/(1+1.1) = 4
    expect(result.finalScore).toBeCloseTo(4, 10);
  });

  /** SCORE-04: a missing answer for a question scores it 0 rather than rejecting the request. */
  it("scores a question with no submitted answer as 0", async () => {
    const { service } = buildSubmitService();

    const result = await service.submitQuiz("quiz-2", [{ questionId: "q1", selectedOptionIds: ["q1-a"] }]);

    expect(result.answers).toEqual([
      { questionId: "q1", correct: true, score: 4 },
      { questionId: "q2", correct: false, score: 0 },
    ]);
  });

  /** Edge case: an option id from the wrong question throws InvalidAnswerError. */
  it("throws InvalidAnswerError when a selected option id belongs to a different question", async () => {
    const { service } = buildSubmitService();

    await expect(
      service.submitQuiz("quiz-2", [{ questionId: "q1", selectedOptionIds: ["q2-a"] }]),
    ).rejects.toBeInstanceOf(InvalidAnswerError);
  });

  /** SCORE-06: resubmitting an already-submitted quiz propagates DuplicateSubmissionError from the repository. */
  it("propagates DuplicateSubmissionError from the repository on resubmission", async () => {
    const { service, repository } = buildSubmitService();
    (repository.createSubmission as ReturnType<typeof vi.fn>).mockRejectedValue(
      new DuplicateSubmissionError(),
    );

    await expect(
      service.submitQuiz("quiz-2", [{ questionId: "q1", selectedOptionIds: ["q1-a"] }]),
    ).rejects.toBeInstanceOf(DuplicateSubmissionError);
  });

  /** SCORE-05: submitting to a nonexistent quiz throws QuizNotFoundError. */
  it("throws QuizNotFoundError when the quiz does not exist", async () => {
    const { service, repository } = buildSubmitService();
    (repository.findQuizWithQuestions as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(service.submitQuiz("missing", [])).rejects.toBeInstanceOf(QuizNotFoundError);
  });
});
