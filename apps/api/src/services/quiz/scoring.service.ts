import type { ScoringQuestion } from "../../models/quiz.model.js";

const MAX_SCORE = 4;
const MIN_SCORE = 0;
const TOTAL_WEIGHT = 100;
const WEIGHT_DECIMALS = 2;

function roundWeight(value: number): number {
  const factor = 10 ** WEIGHT_DECIMALS;
  return Math.round(value * factor) / factor;
}

/**
 * Scores one question (0-4) per SCORE-01: a `single` question scores 4 only
 * when the selected set exactly matches the correct option(s), else 0. A
 * `multiple` question scores `4 * (correctSelected - wrongSelected) /
 * totalCorrect`, clamped to [0, 4]: each wrong pick cancels one correct
 * pick, so selecting every option cannot game the question.
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
  const wrongSelected = selectedSet.size - correctSelected;
  const raw = MAX_SCORE * ((correctSelected - wrongSelected) / totalCorrect);
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, raw));
}

/**
 * Splits 100 equally across `count` questions, two decimals each. The last
 * question absorbs the rounding remainder so the weights add up to exactly
 * 100 (e.g. 3 -> 33.33, 33.33, 33.34; 7 -> 14.29 x6, 14.26).
 */
export function assignWeights(count: number): number[] {
  if (count <= 0) {
    return [];
  }
  const share = roundWeight(TOTAL_WEIGHT / count);
  const weights = Array.from({ length: count }, () => share);
  const allButLast = share * (count - 1);
  weights[count - 1] = roundWeight(TOTAL_WEIGHT - allButLast);
  return weights;
}

/**
 * Final score (SCORE-02): `sum(score * weight) / sum(weight)`, one weight per
 * question, so the result stays on the same 0-4 scale as a single question.
 */
export function computeFinalScore(perQuestionScores: number[], weights: number[]): number {
  if (perQuestionScores.length !== weights.length) {
    throw new Error("each per-question score needs exactly one weight");
  }
  if (perQuestionScores.length === 0) {
    return MIN_SCORE;
  }

  const totals = perQuestionScores.reduce(
    (result, score, index) => ({
      weightedScore: result.weightedScore + score * weights[index],
      weight: result.weight + weights[index],
    }),
    { weightedScore: 0, weight: 0 },
  );

  return totals.weight === 0 ? MIN_SCORE : totals.weightedScore / totals.weight;
}
