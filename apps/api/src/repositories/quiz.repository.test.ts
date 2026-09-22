import { describe, it, expect, beforeEach } from "vitest";
import { createDb, quizzes, submissions } from "../db/client.js";
import { DuplicateSubmissionError } from "../errors/quiz.errors.js";
import type { NewQuizData } from "../models/quiz.model.js";
import { QuizRepository } from "./quiz.repository.js";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres_local:postgres_local@localhost:5432/postgres_local";

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

describe("QuizRepository", () => {
  const db = createDb(DATABASE_URL);
  const repository = new QuizRepository(db);

  beforeEach(async () => {
    // submissions.quiz_id has no onDelete cascade (deliberate - schema.ts),
    // so submissions (which cascades to answers) must be cleared first.
    await db.delete(submissions);
    await db.delete(quizzes);
  });

  describe("createQuizWithQuestions()", () => {
    /**
     * A quiz, its questions and their options are written together.
     * @scenario "a quiz is stored with its questions and options atomically"
     */
    it("reads back the quiz with both questions and their options", async () => {
      const quiz = await repository.createQuizWithQuestions(sampleQuiz);

      const found = await repository.findQuizWithQuestions(quiz.id);

      expect(found).not.toBeNull();
      expect(found?.sourceUrl).toBe(sampleQuiz.sourceUrl);
      expect(found?.questions).toHaveLength(2);
      expect(found?.questions[0].options).toHaveLength(4);
      expect(found?.questions.map((q) => q.text)).toEqual(["question 1", "question 2"]);
    });
  });

  describe("findQuizWithQuestions()", () => {
    /**
     * Correctness flags survive the round trip.
     * @scenario "a stored quiz is read back with its full question and option tree"
     */
    it("keeps which options are correct", async () => {
      const quiz = await repository.createQuizWithQuestions(sampleQuiz);

      const found = await repository.findQuizWithQuestions(quiz.id);

      const correctOptionTexts = found?.questions[1].options
        .filter((o) => o.isCorrect)
        .map((o) => o.text)
        .sort();
      expect(correctOptionTexts).toEqual(["a", "b"]);
    });

    /**
     * An unknown id resolves to nothing rather than failing.
     * @scenario "reading back an unknown quiz id yields nothing"
     */
    it("yields nothing for an unknown id", async () => {
      const found = await repository.findQuizWithQuestions("00000000-0000-0000-0000-000000000000");
      expect(found).toBeNull();
    });
  });

  describe("createSubmission()", () => {
    /**
     * The store enforces one submission per quiz.
     * @scenario "the store refuses a second submission for the same quiz"
     */
    it("refuses a second submission as a duplicate", async () => {
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
  });

  describe("hasSubmission()", () => {
    /**
     * Submission state is queryable so a re-submit can be refused early.
     * @scenario "the store knows whether a quiz has been submitted"
     */
    it("reports no submission before and a submission after storing one", async () => {
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
  });

  describe("listQuizzes()", () => {
    /**
     * Summaries expose the final score only once a quiz has been submitted.
     * @scenario "stored summaries carry the final score once submitted"
     */
    it("carries the final score only for submitted quizzes", async () => {
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

  describe("findSubmissionWithAnswers()", () => {
    /**
     * A stored submission reads back with its per-question answers; nothing exists before it.
     * @scenario "a stored submission is read back with its answers, and nothing before it exists"
     */
    it("yields nothing before and the submission with its answers after storing", async () => {
      const quiz = await repository.createQuizWithQuestions(sampleQuiz);
      expect(await repository.findSubmissionWithAnswers(quiz.id)).toBeNull();

      const found = await repository.findQuizWithQuestions(quiz.id);
      const answerInputs = found!.questions.map((q) => ({
        questionId: q.id,
        selectedOptionIds: q.options.filter((o) => o.isCorrect).map((o) => o.id),
      }));
      await repository.createSubmission(quiz.id, answerInputs, [4, 2.5], 3.25);

      const submission = await repository.findSubmissionWithAnswers(quiz.id);

      expect(submission?.finalScore).toBe(3.25);
      expect(submission?.answers).toHaveLength(2);
      const byQuestion = new Map(submission!.answers.map((a) => [a.questionId, a]));
      expect(byQuestion.get(found!.questions[0].id)?.selectedOptionIds).toEqual(answerInputs[0].selectedOptionIds);
      expect(byQuestion.get(found!.questions[1].id)?.score).toBe(2.5);
    });
  });
});
