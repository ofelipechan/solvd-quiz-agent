import type { QuizSummary } from "@/lib/api-client";

export interface QuizStats {
  total: number;
  submitted: number;
  averageScore: number | null;
}

/** Aggregates history rows: how many quizzes exist, how many were submitted, and their mean score. */
export function computeQuizStats(quizzes: QuizSummary[]): QuizStats {
  const scores = quizzes.flatMap((q) => (q.finalScore === null ? [] : [q.finalScore]));
  const averageScore = scores.length ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null;
  return { total: quizzes.length, submitted: scores.length, averageScore };
}
