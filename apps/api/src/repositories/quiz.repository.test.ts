import { describe, it, expect, beforeEach } from "vitest";
import { createDb, quizzes, submissions } from "@quiz-agent/db";
import { QuizRepository, DuplicateSubmissionError, type NewQuizData } from "./quiz.repository.js";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://quiz_agent:quiz_agent@localhost:5432/quiz_agent";

const sampleQuiz: NewQuizData = {
  sourceUrl: "https://example.com/README.md",
  questions: [
    {
      text: "question 1",
      questionType: "single",
      options: [
        { text: "a", isCorrect: true },
        { text: "b", isCorrect: false },
        { text: "c", isCorrect: false },
        { text: "d", isCorrect: false },
      ],
    },
    {
      text: "question 2",
      questionType: "multiple",
      options: [
        { text: "a", isCorrect: true },
        { text: "b", isCorrect: true },
        { text: "c", isCorrect: false },
        { text: "d", isCorrect: false },
      ],
    },
  ],
};

describe("QuizRepository (integration)", () => {
  const db = createDb(DATABASE_URL);
  const repository = new QuizRepository(db);

  beforeEach(async () => {
    // submissions.quiz_id has no onDelete cascade (deliberate - schema.ts),
    // so submissions (which cascades to answers) must be cleared first.
    await db.delete(submissions);
    await db.delete(quizzes);
  });

  /** GEN-01/SCORE-03: create persists the quiz, its questions, and their options atomically. */
  it("persists a quiz with its questions and options atomically", async () => {
    const quiz = await repository.createQuizWithQuestions(sampleQuiz);

    const found = await repository.findQuizWithQuestions(quiz.id);

    expect(found).not.toBeNull();
    expect(found?.sourceUrl).toBe(sampleQuiz.sourceUrl);
    expect(found?.questions).toHaveLength(2);
    expect(found?.questions[0].options).toHaveLength(4);
    expect(found?.questions.map((q) => q.text)).toEqual(["question 1", "question 2"]);
  });

  /** findQuizWithQuestions returns the full question/option tree for a persisted quiz. */
  it("returns the full question/option tree via findQuizWithQuestions", async () => {
    const quiz = await repository.createQuizWithQuestions(sampleQuiz);

    const found = await repository.findQuizWithQuestions(quiz.id);

    const correctOptionTexts = found?.questions[1].options
      .filter((o) => o.isCorrect)
      .map((o) => o.text)
      .sort();
    expect(correctOptionTexts).toEqual(["a", "b"]);
  });

  it("returns null for a nonexistent quiz id", async () => {
    const found = await repository.findQuizWithQuestions("00000000-0000-0000-0000-000000000000");
    expect(found).toBeNull();
  });

  /** SCORE-06: a second createSubmission on the same quiz throws DuplicateSubmissionError. */
  it("throws DuplicateSubmissionError on a second submission for the same quiz", async () => {
    const quiz = await repository.createQuizWithQuestions(sampleQuiz);
    const found = await repository.findQuizWithQuestions(quiz.id);
    const answerInputs = found!.questions.map((q) => ({
      questionId: q.id,
      selectedOptionIds: q.options.filter((o) => o.isCorrect).map((o) => o.id),
    }));

    await repository.createSubmission(quiz.id, answerInputs, [4, 4], 4);

    await expect(repository.createSubmission(quiz.id, answerInputs, [4, 4], 4)).rejects.toBeInstanceOf(
      DuplicateSubmissionError,
    );
  });

  /** SCORE-06: hasSubmission reflects submission state before and after createSubmission. */
  it("reports hasSubmission correctly before and after a submission", async () => {
    const quiz = await repository.createQuizWithQuestions(sampleQuiz);
    expect(await repository.hasSubmission(quiz.id)).toBe(false);

    const found = await repository.findQuizWithQuestions(quiz.id);
    const answerInputs = found!.questions.map((q) => ({
      questionId: q.id,
      selectedOptionIds: [],
    }));
    await repository.createSubmission(quiz.id, answerInputs, [0, 0], 0);

    expect(await repository.hasSubmission(quiz.id)).toBe(true);
  });

  /** HIST-01: listQuizzes returns each quiz with its final score, or null if unsubmitted. */
  it("lists quizzes with final score if submitted, null otherwise", async () => {
    const submittedQuiz = await repository.createQuizWithQuestions(sampleQuiz);
    const unsubmittedQuiz = await repository.createQuizWithQuestions({
      ...sampleQuiz,
      sourceUrl: "https://example.com/OTHER.md",
    });

    const found = await repository.findQuizWithQuestions(submittedQuiz.id);
    const answerInputs = found!.questions.map((q) => ({
      questionId: q.id,
      selectedOptionIds: q.options.filter((o) => o.isCorrect).map((o) => o.id),
    }));
    await repository.createSubmission(submittedQuiz.id, answerInputs, [4, 4], 4);

    const summaries = await repository.listQuizzes();
    const submittedSummary = summaries.find((s) => s.id === submittedQuiz.id);
    const unsubmittedSummary = summaries.find((s) => s.id === unsubmittedQuiz.id);

    expect(submittedSummary?.finalScore).toBe(4);
    expect(unsubmittedSummary?.finalScore).toBeNull();
  });
});
