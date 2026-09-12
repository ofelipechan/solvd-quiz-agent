export interface ScoringOption {
  id: string;
  isCorrect: boolean;
}

export interface ScoringQuestion {
  questionType: "single" | "multiple";
  options: ScoringOption[];
}

const MAX_SCORE = 4;
const MIN_SCORE = 0;
const WEIGHT_GROWTH = 1.1;

/**
 * Scores one question (0-4) per SCORE-01: a `single` question scores 4 only
 * when the selected set exactly matches the correct option(s), else 0. A
 * `multiple` question scores `4 * correctSelected/totalCorrect` with no
 * penalty for wrong extra picks, clamped to [0, 4].
 */
export function scoreQuestion(question: ScoringQuestion, selectedOptionIds: string[]): number {
  const correctIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);
  const selectedSet = new Set(selectedOptionIds);

  if (question.questionType === "single") {
    const correctSet = new Set(correctIds);
    const exactMatch =
      selectedSet.size === correctSet.size && [...selectedSet].every((id) => correctSet.has(id));
    return exactMatch ? MAX_SCORE : MIN_SCORE;
  }

  const totalCorrect = correctIds.length;
  if (totalCorrect === 0) {
    return MIN_SCORE;
  }
  const correctSelected = correctIds.filter((id) => selectedSet.has(id)).length;
  const raw = MAX_SCORE * (correctSelected / totalCorrect);
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, raw));
}

/**
 * Weighted average final score (SCORE-02): `sum(score_i * weight_i) /
 * sum(weight_i)`, `weight_i = 1.1^(i-1)` for the i-th question (i starting
 * at 1, so `perQuestionScores[0]` gets weight `1.1^0 = 1`).
 */
export function computeFinalScore(perQuestionScores: number[]): number {
  if (perQuestionScores.length === 0) {
    return 0;
  }

  const weights = perQuestionScores.map((_, index) => WEIGHT_GROWTH ** index);
  const weightedSum = perQuestionScores.reduce((sum, score, index) => sum + score * weights[index], 0);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  return weightedSum / totalWeight;
}
