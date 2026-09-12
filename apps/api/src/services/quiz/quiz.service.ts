import type { AnswerInput, AnswerResult, SubmitResponse } from "@quiz-agent/shared";
import { AppError } from "../../app.js";
import type { QuestionGenerationStrategy } from "./generation-strategy.js";
import { scoreQuestion, computeFinalScore } from "./scoring.service.js";
import type {
  QuizRepository,
  QuizWithQuestions,
  Quiz,
  NewQuestionData,
  QuizSummary,
} from "../../repositories/quiz.repository.js";

/** Thrown when a quiz id has no matching row (SCORE-05 edge case / 404). */
export class QuizNotFoundError extends AppError {
  constructor() {
    super("quiz not found", 404);
  }
}

/** Thrown when a submitted option id doesn't belong to its referenced question. */
export class InvalidAnswerError extends AppError {
  constructor() {
    super("selected option does not belong to the referenced question", 400);
  }
}

const FULL_SCORE = 4;

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
    const { content } = await this.fetchMarkdown(sourceUrl);
    const generated = await this.generationStrategy.generate(content);

    const questionsData: NewQuestionData[] = generated.questions.map((q) => ({
      text: q.text,
      questionType: q.questionType,
      options: q.options,
    }));

    const quiz: Quiz = await this.repository.createQuizWithQuestions({
      sourceUrl,
      questions: questionsData,
    });

    const withQuestions = await this.repository.findQuizWithQuestions(quiz.id);
    if (!withQuestions) {
      throw new QuizNotFoundError();
    }
    return withQuestions;
  }

  /** Loads a quiz's full question/option tree, or throws QuizNotFoundError (SCORE-05). */
  async getQuizForSubmission(quizId: string): Promise<QuizWithQuestions> {
    const quiz = await this.repository.findQuizWithQuestions(quizId);
    if (!quiz) {
      throw new QuizNotFoundError();
    }
    return quiz;
  }

  /**
   * SCORE-01/03/04/05/06: scores and persists a submission. A question
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

      const score = scoreQuestion(
        { questionType: question.questionType, options: question.options },
        answer.selectedOptionIds,
      );

      scores.push(score);
      results.push({ questionId: question.id, correct: score === FULL_SCORE, score });
      normalizedAnswers.push({ questionId: question.id, selectedOptionIds: answer.selectedOptionIds });
    }

    const finalScore = computeFinalScore(scores);

    await this.repository.createSubmission(quizId, normalizedAnswers, scores, finalScore);

    return { answers: results, finalScore };
  }

  /** HIST-01: lists quizzes with their final score, if submitted. Thin passthrough to the repository. */
  async listQuizzes(): Promise<QuizSummary[]> {
    return this.repository.listQuizzes();
  }
}
