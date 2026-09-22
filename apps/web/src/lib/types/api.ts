export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateQuizRequest {
  sourceUrl: string;
}

export interface AnswerInput {
  questionId: string;
  selectedOptionIds: string[];
}

export interface SubmitRequest {
  answers: AnswerInput[];
}

/** The explanation attached to one option the user picked. */
export interface OptionFeedback {
  optionId: string;
  feedback: string;
}

export interface AnswerResult {
  questionId: string;
  correct: boolean;
  score: number;
  /** Share of the final score, in percent. */
  weight: number;
  correctOptionIds: string[];
  /** Why each option the user picked was right or wrong; only sent after submitting. */
  selectedOptionFeedback: OptionFeedback[];
}

export interface SubmitResponse {
  answers: AnswerResult[];
  finalScore: number;
}

export interface PublicOption {
  id: string;
  text: string;
}

export interface PublicQuestion {
  id: string;
  orderIndex: number;
  text: string;
  questionType: "single" | "multiple";
  /** Share of the final score, in percent; a quiz's weights add up to 100. */
  weight: number;
  options: PublicOption[];
}

export interface SubmittedAnswer extends AnswerResult {
  selectedOptionIds: string[];
}

export interface QuizSubmission {
  finalScore: number;
  submittedAt: string;
  answers: SubmittedAnswer[];
}

export interface QuizDetailResponse {
  id: string;
  sourceUrl: string;
  createdAt: string;
  questions: PublicQuestion[];
  submission: QuizSubmission | null;
}
