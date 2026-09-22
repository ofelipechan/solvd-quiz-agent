import { describe, it, expect } from "vitest";
import type { ScoringQuestion } from "../../models/quiz.model.js";
import { scoreQuestion, computeFinalScore } from "./scoring.service.js";

const singleQuestion: ScoringQuestion = {
  questionType: "single",
  options: [
    { id: "a", isCorrect: true },
    { id: "b", isCorrect: false },
    { id: "c", isCorrect: false },
    { id: "d", isCorrect: false },
  ],
};

const multipleQuestion: ScoringQuestion = {
  questionType: "multiple",
  options: [
    { id: "a", isCorrect: true },
    { id: "b", isCorrect: true },
    { id: "c", isCorrect: false },
    { id: "d", isCorrect: false },
  ],
};

describe("scoreQuestion()", () => {
  describe("given a single-answer question", () => {
    /**
     * A correct single answer earns full marks.
     * @scenario "the correct single answer scores 4"
     */
    it("scores 4 for the correct option", () => {
      expect(scoreQuestion(singleQuestion, ["a"])).toBe(4);
    });

    /**
     * A wrong single answer earns nothing.
     * @scenario "a wrong single answer scores 0"
     */
    it("scores 0 for a wrong option", () => {
      expect(scoreQuestion(singleQuestion, ["b"])).toBe(0);
    });
  });

  describe("given a multiple-answer question", () => {
    /**
     * Picking every correct option earns full marks.
     * @scenario "selecting every correct option scores 4"
     */
    it("scores 4 for both correct options", () => {
      expect(scoreQuestion(multipleQuestion, ["a", "b"])).toBe(4);
    });

    /**
     * Partial credit is proportional to the correct options picked.
     * @scenario "selecting some of the correct options earns partial credit"
     */
    it("scores 2 for 1 of 2 correct options", () => {
      expect(scoreQuestion(multipleQuestion, ["a"])).toBe(2);
    });

    /**
     * Wrong extra picks do not subtract from the score.
     * @scenario "an extra wrong pick is not penalized"
     */
    it("scores 4 for both correct options plus a wrong one", () => {
      expect(scoreQuestion(multipleQuestion, ["a", "b", "c"])).toBe(4);
    });

    /**
     * An empty selection models a missing answer and earns nothing.
     * @scenario "selecting nothing scores 0"
     */
    it("scores 0 for no options", () => {
      expect(scoreQuestion(multipleQuestion, [])).toBe(0);
    });
  });
});

describe("computeFinalScore()", () => {
  /**
   * Weights start at 1.0 and grow geometrically by 10%.
   * @scenario "the final score is a weighted average of per-question scores"
   */
  it("scores about 1.9048 for 4 then 0", () => {
    expect(computeFinalScore([4, 0])).toBeCloseTo(1.9048, 4);
  });

  /**
   * A later question influences the result more than an earlier one.
   * @scenario "each later question weighs 10 percent more than the previous one"
   */
  it("scores about 2.0952 for 0 then 4", () => {
    expect(computeFinalScore([0, 4])).toBeCloseTo(2.0952, 4);
  });

  /**
   * Averaging never lowers a perfect quiz.
   * @scenario "a fully correct quiz keeps the maximum score"
   */
  it("scores 4 for three perfect answers", () => {
    expect(computeFinalScore([4, 4, 4])).toBe(4);
  });

  /**
   * An empty quiz has no score to average.
   * @scenario "a quiz with no questions scores 0"
   */
  it("scores 0 for no questions", () => {
    expect(computeFinalScore([])).toBe(0);
  });
});
