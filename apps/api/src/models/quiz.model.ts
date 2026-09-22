export interface NewOptionData {
  text: string;
  isCorrect: boolean;
}

export interface NewQuestionData {
  text: string;
  questionType: "single" | "multiple";
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

export interface OptionRow {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface QuestionRow {
  id: string;
  orderIndex: number;
  text: string;
  questionType: "single" | "multiple";
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

export interface SubmissionWithAnswers extends Submission {
  answers: SubmittedAnswerRow[];
}

/** Per-question review: the user's picks, the score, and the correct option ids. */
export interface ReviewedAnswer extends SubmittedAnswerRow {
  correct: boolean;
  correctOptionIds: string[];
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
