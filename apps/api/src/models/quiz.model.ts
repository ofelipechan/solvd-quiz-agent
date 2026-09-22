export interface NewOptionData {
  text: string;
  isCorrect: boolean;
  /** Why this option is correct or incorrect. */
  feedback: string;
}

export interface NewQuestionData {
  text: string;
  questionType: "single" | "multiple";
  /** Share of the final score, in percent; all weights of a quiz add up to 100. */
  weight: number;
  options: NewOptionData[];
}

export interface NewQuizData {
  sourceUrl: string;
  questions: NewQuestionData[];
}

export interface Quiz {
  id: string;
  sourceUrl: string;
  createdAt: Date;
}

/**
 * One option of a question. `isCorrect` and `feedback` form the answer key:
 * both are omitted unless the caller explicitly asks for them, so neither
 * leaks to a client that has not submitted yet.
 */
export interface OptionRow {
  id: string;
  text: string;
  isCorrect?: boolean;
  feedback?: string;
}

export interface QuestionRow {
  id: string;
  orderIndex: number;
  text: string;
  questionType: "single" | "multiple";
  weight: number;
  options: OptionRow[];
}

export interface QuizWithQuestions extends Quiz {
  questions: QuestionRow[];
}

export interface Submission {
  id: string;
  quizId: string;
  finalScore: number;
  submittedAt: Date;
}

/** One persisted answer row of a submission. */
export interface SubmittedAnswerRow {
  questionId: string;
  selectedOptionIds: string[];
  score: number;
}

/** The explanation attached to one option the user picked. */
export interface OptionFeedback {
  optionId: string;
  feedback: string;
}

export interface SubmissionWithAnswers extends Submission {
  answers: SubmittedAnswerRow[];
}

/**
 * Per-question review: the user's picks, the score, the question's weight,
 * the correct option ids, and the feedback for each option the user picked.
 */
export interface ReviewedAnswer extends SubmittedAnswerRow {
  correct: boolean;
  weight: number;
  correctOptionIds: string[];
  selectedOptionFeedback: OptionFeedback[];
}

export interface QuizSubmissionDetail {
  finalScore: number;
  submittedAt: Date;
  answers: ReviewedAnswer[];
}

/** `GET /api/quizzes/:id` payload: public question tree plus the submission, if any. */
export interface QuizDetail extends QuizWithQuestions {
  submission: QuizSubmissionDetail | null;
}

export interface QuizSummary {
  id: string;
  sourceUrl: string;
  createdAt: Date;
  finalScore: number | null;
}

export interface ScoringOption {
  id: string;
  isCorrect: boolean;
}

export interface ScoringQuestion {
  questionType: "single" | "multiple";
  options: ScoringOption[];
}
