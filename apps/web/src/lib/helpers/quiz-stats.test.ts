import { describe, it, expect } from "vitest";
import { computeQuizStats } from "./quiz-stats";

describe("computeQuizStats()", () => {
  /**
   * Every quiz counts toward the total; only submitted ones toward the mean.
   * @scenario "history stats count every quiz, the submitted ones, and their mean score"
   */
  it("counts 3 quizzes, 2 submitted, average 4", () => {
    expect(
      computeQuizStats([
        { id: "a", sourceUrl: "u", createdAt: "2026-01-01T00:00:00Z", finalScore: 3 },
        { id: "b", sourceUrl: "u", createdAt: "2026-01-01T00:00:00Z", finalScore: 5 },
        { id: "c", sourceUrl: "u", createdAt: "2026-01-01T00:00:00Z", finalScore: null },
      ]),
    ).toEqual({ total: 3, submitted: 2, averageScore: 4 });
  });

  /**
   * An empty history yields zeros and no average.
   * @scenario "history stats have no average when nothing was submitted"
   */
  it("counts nothing and has no average", () => {
    expect(computeQuizStats([])).toEqual({ total: 0, submitted: 0, averageScore: null });
  });
});
