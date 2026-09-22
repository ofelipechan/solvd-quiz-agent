import type { AnswerInput, AnswerResult, SubmitResponse } from "../../schemas/api.schema.js";
import { startActiveObservation } from "@langfuse/tracing";
import {
  InsufficientContentError,
  InvalidAnswerError,
  QuizNotFoundError,
} from "../../errors/quiz.errors.js";
import type {
  NewQuestionData,
  Quiz,
  QuizDetail,
  QuizSubmissionDetail,
  QuizSummary,
  QuizWithQuestions,
  ReviewedAnswer,
} from "../../models/quiz.model.js";
import type { QuizRepository } from "../../repositories/quiz.repository.js";
import type { QuestionGenerationStrategy } from "./generation-strategy.js";
import { scoreQuestion, computeFinalScore } from "./scoring.service.js";

/**
 * Conservative floor below which a source cannot plausibly yield 5
 * substantive questions. Chosen well under any real README (a few short
 * sentences), so it only catches genuinely empty/near-empty sources
 * without rejecting legitimate short-but-usable docs before the LLM
 * even gets a chance.
 */
const MIN_CONTENT_LENGTH = 200;

const FULL_SCORE = 4;

/** Joins persisted answers with each question's correct option ids so the client can render a review. */
function reviewSubmission(
  quiz: QuizWithQuestions,
  submission: { finalScore: number; submittedAt: Date; answers: Array<{ questionId: string; selectedOptionIds: string[]; score: number }> },
): QuizSubmissionDetail {
  const answerByQuestion = new Map(submission.answers.map((a) => [a.questionId, a]));
  const answers: ReviewedAnswer[] = quiz.questions.map((question) => {
    const answer = answerByQuestion.get(question.id) ?? { questionId: question.id, selectedOptionIds: [], score: 0 };
    return {
      questionId: question.id,
      selectedOptionIds: answer.selectedOptionIds,
      score: answer.score,
      correct: answer.score === FULL_SCORE,
      correctOptionIds: question.options.filter((o) => o.isCorrect).map((o) => o.id),
    };
  });
  return { finalScore: submission.finalScore, submittedAt: submission.submittedAt, answers };
}

/** The slice of `fetchMarkdown`'s signature `QuizService` depends on. */
export type MarkdownFetcherFn = (url: string) => Promise<{ content: string; sourceUrl: string }>;

/** Orchestrates fetch -> generate -> persist for quiz creation, and quiz lookup for submit. */
export class QuizService {
  constructor(
    private readonly fetchMarkdown: MarkdownFetcherFn,
    private readonly generationStrategy: QuestionGenerationStrategy,
    private readonly repository: QuizRepository,
  ) {}

  /**
   * GEN-01/GEN-06/GEN-07: fetches the source, generates questions, and
   * persists the quiz. Fetch or generation failures propagate without
   * calling the next step or persisting a partial quiz.
   */
  async createQuiz(sourceUrl: string): Promise<QuizWithQuestions> {
    // One quiz creation = one Langfuse trace, rooted here; each step below is a child observation.
    return startActiveObservation("create-quiz", async (root) => {
      root.update({ input: { sourceUrl } });

      // Step 1 - Fetch data
      const content = await this.fetchSource(sourceUrl);
      if (content.trim().length < MIN_CONTENT_LENGTH) {
        throw new InsufficientContentError();
      }

      // Step 2 - Generate strategy
      const generated = await this.generationStrategy.generate(content);

      // Step 3 - Generate questions
      const questionsData: NewQuestionData[] = generated.questions.map((q) => ({
        text: q.text,
        questionType: q.questionType,
        options: q.options,
      }));

      // Step 4/5 - Store quiz questions and reload them
      const withQuestions = await this.persistQuiz(sourceUrl, questionsData);
      root.update({ output: { quizId: withQuestions.id, questionCount: withQuestions.questions.length } });
      return withQuestions;
    });
  }

  /** Traced as a `retriever`: a pure lookup of the source document. */
  private fetchSource(sourceUrl: string): Promise<string> {
    return startActiveObservation(
      "fetch-source",
      async (retriever) => {
        retriever.update({ input: { sourceUrl } });
        const { content } = await this.fetchMarkdown(sourceUrl);
        retriever.update({ output: { sourceUrl, contentLength: content.length } });
        return content;
      },
      { asType: "retriever" },
    );
  }

  /** Traced as its own step so slow writes show up in the trace tree. */
  private persistQuiz(sourceUrl: string, questions: NewQuestionData[]): Promise<QuizWithQuestions> {
    return startActiveObservation("persist-quiz", async (span) => {
      span.update({ input: { questionCount: questions.length } });
      const quiz: Quiz = await this.repository.createQuizWithQuestions({ sourceUrl, questions });

      const withQuestions = await this.repository.findQuizWithQuestions(quiz.id);
      if (!withQuestions) {
        throw new QuizNotFoundError();
      }
      span.update({ output: { quizId: withQuestions.id } });
      return withQuestions;
    });
  }

  /**
   * Loads a quiz's full question/option tree with `isCorrect` included
   * (needed for scoring), or throws QuizNotFoundError (SCORE-05).
   */
  async getQuizForSubmission(quizId: string): Promise<QuizWithQuestions> {
    const quiz = await this.repository.findQuizWithQuestions(quizId, true);
    if (!quiz) {
      throw new QuizNotFoundError();
    }
    return quiz;
  }

  /**
   * Scores and persists a submission. A question
   * with no matching answer is treated as 0 (no selections, SCORE-04). An
   * option id that doesn't belong to its question throws
   * `InvalidAnswerError`. Duplicate submission is enforced by the
   * repository's unique-constraint mapping to `DuplicateSubmissionError`.
   */
  async submitQuiz(quizId: string, answerInputs: AnswerInput[]): Promise<SubmitResponse> {
    const quiz = await this.getQuizForSubmission(quizId);
    const answerByQuestion = new Map(answerInputs.map((a) => [a.questionId, a]));

    const scores: number[] = [];
    const results: AnswerResult[] = [];
    const normalizedAnswers: AnswerInput[] = [];

    for (const question of quiz.questions) {
      const answer = answerByQuestion.get(question.id) ?? {
        questionId: question.id,
        selectedOptionIds: [],
      };

      const validOptionIds = new Set(question.options.map((o) => o.id));
      for (const optionId of answer.selectedOptionIds) {
        if (!validOptionIds.has(optionId)) {
          throw new InvalidAnswerError();
        }
      }

      const scoringOptions = question.options.map((o) => ({ id: o.id, isCorrect: o.isCorrect ?? false }));
      const score = scoreQuestion({ questionType: question.questionType, options: scoringOptions }, answer.selectedOptionIds);
      const correctOptionIds = scoringOptions.filter((o) => o.isCorrect).map((o) => o.id);

      scores.push(score);
      results.push({ questionId: question.id, correct: score === FULL_SCORE, score, correctOptionIds });
      normalizedAnswers.push({ questionId: question.id, selectedOptionIds: answer.selectedOptionIds });
    }

    const finalScore = computeFinalScore(scores);

    await this.repository.createSubmission(quizId, normalizedAnswers, scores, finalScore);

    return { answers: results, finalScore };
  }

  /**
   * HIST-02/HIST-03: loads a quiz for display. Options never carry
   * `isCorrect`; the correct option ids are only revealed inside the
   * `submission` block, which exists once the quiz was submitted.
   */
  async getQuiz(quizId: string): Promise<QuizDetail> {
    const quiz = await this.getQuizForSubmission(quizId);
    const submission = await this.repository.findSubmissionWithAnswers(quizId);

    const publicQuestions = quiz.questions.map((q) => ({
      ...q,
      options: q.options.map(({ id, text }) => ({ id, text })),
    }));

    return { ...quiz, questions: publicQuestions, submission: submission ? reviewSubmission(quiz, submission) : null };
  }

  /** HIST-01: lists quizzes with their final score, if submitted. Thin passthrough to the repository. */
  async listQuizzes(): Promise<QuizSummary[]> {
    return this.repository.listQuizzes();
  }
}
