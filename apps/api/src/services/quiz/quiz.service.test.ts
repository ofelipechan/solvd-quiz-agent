import { describe, it, expect, vi } from "vitest";
import { QuizService, QuizNotFoundError, type MarkdownFetcherFn } from "./quiz.service.js";
import type { QuestionGenerationStrategy } from "./generation-strategy.js";
import type { QuizRepository, QuizWithQuestions } from "../../repositories/quiz.repository.js";

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
    .mockResolvedValue({ content: "# doc", sourceUrl: "https://example.com/README.md" });
  const strategy: QuestionGenerationStrategy = { generate: vi.fn().mockResolvedValue(generatedQuiz) };
  const repository = {
    createQuizWithQuestions: vi.fn().mockResolvedValue({
      id: persistedQuiz.id,
      sourceUrl: persistedQuiz.sourceUrl,
      createdAt: persistedQuiz.createdAt,
    }),
    findQuizWithQuestions: vi.fn().mockResolvedValue(persistedQuiz),
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
      return { content: "# doc", sourceUrl: "https://example.com/README.md" };
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
