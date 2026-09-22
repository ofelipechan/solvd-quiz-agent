import { eq, sql } from "drizzle-orm";
import { quizzes, questions, options, submissions, answers, type Db } from "../db/client.js";
import type { AnswerInput } from "../schemas/api.schema.js";
import { DuplicateSubmissionError } from "../errors/quiz.errors.js";
import type {
  NewQuizData,
  QuestionRow,
  Quiz,
  QuizSummary,
  QuizWithQuestions,
  Submission,
  SubmissionWithAnswers,
} from "../models/quiz.model.js";

/** Postgres unique-violation SQLSTATE code. */
const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === UNIQUE_VIOLATION;
}

/** Data access for `quizzes`, `questions`, `options`, `submissions`, `answers`. */
export class QuizRepository {
  constructor(private readonly db: Db) {}

  /** Persists a quiz with its questions and options in a single transaction. */
  async createQuizWithQuestions(data: NewQuizData): Promise<Quiz> {
    return this.db.transaction(async (tx) => {
      const [quizRow] = await tx.insert(quizzes).values({ sourceUrl: data.sourceUrl }).returning();

      for (const [index, question] of data.questions.entries()) {
        const [questionRow] = await tx
          .insert(questions)
          .values({
            quizId: quizRow.id,
            orderIndex: index + 1,
            text: question.text,
            questionType: question.questionType,
          })
          .returning();

        if (question.options.length > 0) {
          await tx.insert(options).values(
            question.options.map((o) => ({
              questionId: questionRow.id,
              text: o.text,
              isCorrect: o.isCorrect,
            })),
          );
        }
      }

      return quizRow;
    });
  }

  /**
   * Loads a quiz with its full question/option tree, ordered by `orderIndex`.
   * `isCorrect` is omitted from options unless `includeIsCorrect` is true —
   * it's a back-end-only attribute (scoring), callers opt in explicitly.
   */
  async findQuizWithQuestions(id: string, includeIsCorrect = false): Promise<QuizWithQuestions | null> {
    const [quizRow] = await this.db.select().from(quizzes).where(eq(quizzes.id, id));
    if (!quizRow) {
      return null;
    }

    const questionRows = await this.db
      .select()
      .from(questions)
      .where(eq(questions.quizId, id))
      .orderBy(questions.orderIndex);

    const questionsWithOptions: QuestionRow[] = [];
    for (const q of questionRows) {
      const optionRows = await this.db
        .select({
          id: options.id,
          text: options.text,
          ...(includeIsCorrect ? { isCorrect: options.isCorrect } : {}),
        })
        .from(options)
        .where(eq(options.questionId, q.id));

      questionsWithOptions.push({
        id: q.id,
        orderIndex: q.orderIndex,
        text: q.text,
        questionType: q.questionType,
        options: optionRows,
      });
    }

    return { ...quizRow, questions: questionsWithOptions };
  }

  /** Whether `quizId` already has a submission (SCORE-06). */
  async hasSubmission(quizId: string): Promise<boolean> {
    const [row] = await this.db.select().from(submissions).where(eq(submissions.quizId, quizId));
    return row !== undefined;
  }

  /**
   * Persists the submission and its per-question answers in a single
   * transaction. Maps the DB unique-violation on `submissions.quiz_id`
   * (second submit of the same quiz) to `DuplicateSubmissionError`.
   */
  async createSubmission(
    quizId: string,
    answerInputs: AnswerInput[],
    scores: number[],
    finalScore: number,
  ): Promise<Submission> {
    try {
      return await this.db.transaction(async (tx) => {
        const [submissionRow] = await tx
          .insert(submissions)
          .values({ quizId, finalScore: finalScore.toFixed(2) })
          .returning();

        if (answerInputs.length > 0) {
          await tx.insert(answers).values(
            answerInputs.map((answer, index) => ({
              submissionId: submissionRow.id,
              questionId: answer.questionId,
              selectedOptionIds: answer.selectedOptionIds,
              score: scores[index].toFixed(2),
            })),
          );
        }

        return {
          id: submissionRow.id,
          quizId: submissionRow.quizId,
          finalScore: Number(submissionRow.finalScore),
          submittedAt: submissionRow.submittedAt,
        };
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new DuplicateSubmissionError();
      }
      throw err;
    }
  }

  /** Loads a quiz's submission with its per-question answers, or null when not yet submitted (HIST-03). */
  async findSubmissionWithAnswers(quizId: string): Promise<SubmissionWithAnswers | null> {
    const [submissionRow] = await this.db.select().from(submissions).where(eq(submissions.quizId, quizId));
    if (!submissionRow) {
      return null;
    }

    const answerRows = await this.db
      .select({
        questionId: answers.questionId,
        selectedOptionIds: answers.selectedOptionIds,
        score: answers.score,
      })
      .from(answers)
      .where(eq(answers.submissionId, submissionRow.id));

    return {
      id: submissionRow.id,
      quizId: submissionRow.quizId,
      finalScore: Number(submissionRow.finalScore),
      submittedAt: submissionRow.submittedAt,
      answers: answerRows.map((a) => ({
        questionId: a.questionId,
        selectedOptionIds: a.selectedOptionIds,
        score: Number(a.score),
      })),
    };
  }

  /** Lists all quizzes with their final score, if submitted (HIST-01). */
  async listQuizzes(): Promise<QuizSummary[]> {
    const rows = await this.db
      .select({
        id: quizzes.id,
        sourceUrl: quizzes.sourceUrl,
        createdAt: quizzes.createdAt,
        finalScore: submissions.finalScore,
      })
      .from(quizzes)
      .leftJoin(submissions, eq(submissions.quizId, quizzes.id))
      .orderBy(sql`${quizzes.createdAt} desc`);

    return rows.map((r) => ({
      id: r.id,
      sourceUrl: r.sourceUrl,
      createdAt: r.createdAt,
      finalScore: r.finalScore === null ? null : Number(r.finalScore),
    }));
  }
}
