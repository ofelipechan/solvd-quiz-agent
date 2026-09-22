import { describe, it, expect } from "vitest";
import type { ScoringQuestion } from "../../models/quiz.model.js";
import { scoreQuestion, computeFinalScore, assignWeights } from "./scoring.service.js";

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
     * A wrong pick removes the credit one correct pick adds.
     * @scenario "a wrong pick cancels one correct pick"
     */
    it("scores 2 for both correct options plus a wrong one", () => {
      expect(scoreQuestion(multipleQuestion, ["a", "b", "c"])).toBe(2);
    });

    /**
     * Selecting everything cannot game the question: wrong picks cancel the correct ones.
     * @scenario "selecting every option earns nothing when wrong picks match correct ones"
     */
    it("scores 0 for all four options", () => {
      expect(scoreQuestion(multipleQuestion, ["a", "b", "c", "d"])).toBe(0);
    });

    /**
     * The penalty is clamped so a question never scores negative.
     * @scenario "more wrong picks than correct picks never scores below 0"
     */
    it("scores 0 for one correct and two wrong options", () => {
      expect(scoreQuestion(multipleQuestion, ["a", "c", "d"])).toBe(0);
    });

    /**
     * Credit and penalty are both measured against the number of correct options.
     * @scenario "penalty is proportional to the number of correct options"
     */
    it("scores 2.67 for all four options when three are correct", () => {
      const threeCorrect: ScoringQuestion = {
        questionType: "multiple",
        options: [
          { id: "a", isCorrect: true },
          { id: "b", isCorrect: true },
          { id: "c", isCorrect: true },
          { id: "d", isCorrect: false },
        ],
      };
      expect(scoreQuestion(threeCorrect, ["a", "b", "c", "d"])).toBeCloseTo(2.67, 2);
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

describe("assignWeights()", () => {
  /**
   * Weights are an equal split of 100 across the questions.
   * @scenario "weights are split equally across the questions"
   */
  it("gives 5 questions 20 each", () => {
    expect(assignWeights(5)).toEqual([20, 20, 20, 20, 20]);
  });

  /**
   * Two-decimal rounding leaves a remainder that the last question absorbs.
   * @scenario "weights keep two decimals and the last question absorbs the rounding remainder"
   */
  it("gives 3 questions 33.33, 33.33 and 33.34", () => {
    const weights = assignWeights(3);
    expect(weights).toEqual([33.33, 33.33, 33.34]);
    expect(weights.reduce((sum, w) => sum + w, 0)).toBeCloseTo(100, 10);
  });

  /**
   * When rounding overshoots, the last question weighs less than the others.
   * @scenario "a remainder can also lower the last weight"
   */
  it("gives 7 questions 14.29 x6 and 14.26", () => {
    const weights = assignWeights(7);
    expect(weights).toEqual([14.29, 14.29, 14.29, 14.29, 14.29, 14.29, 14.26]);
    expect(weights.reduce((sum, w) => sum + w, 0)).toBeCloseTo(100, 10);
  });

  /**
   * Nothing to weigh yields nothing.
   * @scenario "assigning weights to no questions yields no weights"
   */
  it("gives no weights for 0 questions", () => {
    expect(assignWeights(0)).toEqual([]);
  });
});

describe("computeFinalScore()", () => {
  /**
   * Each score is scaled by its question's weight and divided by the total weight.
   * @scenario "the final score is a weighted average of per-question scores"
   */
  it("scores 0.8 for 4 and 0 weighted 20 and 80", () => {
    expect(computeFinalScore([4, 0], [20, 80])).toBeCloseTo(0.8, 10);
  });

  /**
   * The heavier question dominates the result.
   * @scenario "a heavier question moves the final score more"
   */
  it("scores 3.2 for 0 and 4 weighted 20 and 80", () => {
    expect(computeFinalScore([0, 4], [20, 80])).toBeCloseTo(3.2, 10);
  });

  /**
   * A partial score is weighted the same way as a full one.
   * @scenario "partial credit is weighted like any other score"
   */
  it("scores 3 for 4 and 2 weighted 50 and 50", () => {
    expect(computeFinalScore([4, 2], [50, 50])).toBeCloseTo(3, 10);
  });

  /**
   * Averaging never lowers a perfect quiz, even with uneven rounded weights.
   * @scenario "a fully correct quiz keeps the maximum score"
   */
  it("scores 4 for three perfect answers", () => {
    expect(computeFinalScore([4, 4, 4], [33.33, 33.33, 33.34])).toBeCloseTo(4, 10);
  });

  /**
   * An empty quiz has no score to average.
   * @scenario "a quiz with no questions scores 0"
   */
  it("scores 0 for no questions", () => {
    expect(computeFinalScore([], [])).toBe(0);
  });

  /**
   * Every score needs exactly one weight.
   * @scenario "mismatched scores and weights are rejected"
   */
  it("rejects 2 scores with 3 weights", () => {
    expect(() => computeFinalScore([4, 0], [20, 30, 50])).toThrow();
  });
});
