const MAX_SCORE = 4;

/** Maps the canonical 0-4 final score onto 0-100 (4 -> 100, 2 -> 50, 3.5 -> 87.5). */
export function scoreToPercentage(finalScore: number): number {
  return (finalScore / MAX_SCORE) * 100;
}

/** Percentage label with one decimal, e.g. "87.5%". */
export function formatScorePercentage(finalScore: number): string {
  return `${scoreToPercentage(finalScore).toFixed(1)}%`;
}

/** Weight label without trailing decimals when whole, e.g. "20%" or "33.33%". */
export function formatWeight(weight: number): string {
  return `${Number.isInteger(weight) ? weight : weight.toFixed(2)}%`;
}
