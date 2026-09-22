import { describe, it, expect } from "vitest";
import { scoreToPercentage } from "./score-percentage";

describe("scoreToPercentage()", () => {
  /**
   * The 0-4 canonical score maps linearly onto 0-100.
   * @scenario "the maximum score is 100 percent"
   */
  it("maps 4 to 100", () => {
    expect(scoreToPercentage(4)).toBe(100);
  });

  /**
   * Half the maximum is half the percentage.
   * @scenario "half the maximum score is 50 percent"
   */
  it("maps 2 to 50", () => {
    expect(scoreToPercentage(2)).toBe(50);
  });

  /**
   * Fractional scores are not rounded away.
   * @scenario "the percentage keeps fractions"
   */
  it("maps 3.5 to 87.5", () => {
    expect(scoreToPercentage(3.5)).toBe(87.5);
  });
});
