import { AppError } from "../../app.js";
import type { QuestionGenerationStrategy } from "./generation-strategy.js";
import type {
  QuizRepository,
  QuizWithQuestions,
  Quiz,
  NewQuestionData,
} from "../../repositories/quiz.repository.js";

/** Thrown when a quiz id has no matching row (SCORE-05 edge case / 404). */
export class QuizNotFoundError extends AppError {
  constructor() {
    super("quiz not found", 404);
  }
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
}
