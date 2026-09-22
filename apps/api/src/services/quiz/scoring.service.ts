import type { ScoringQuestion } from "../../models/quiz.model.js";

const MAX_SCORE = 4;
const MIN_SCORE = 0;
const WEIGHT_GROWTH_FACTOR = 1.1;

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
 * Final score (SCORE-02): weighted average of per-question scores. Weight
 * starts at 1.0 and increases by 10% for each subsequent question, keeping
 * the result on the same 0-4 scale as an individual question.
 */
export function computeFinalScore(perQuestionScores: number[]): number {
  if (perQuestionScores.length === 0) {
    return MIN_SCORE;
  }

  const totals = perQuestionScores.reduce(
    (result, score, index) => {
      const weight = WEIGHT_GROWTH_FACTOR ** index;
      return {
        weightedScore: result.weightedScore + score * weight,
        weight: result.weight + weight,
      };
    },
    { weightedScore: 0, weight: 0 },
  );

  return totals.weightedScore / totals.weight;
}
