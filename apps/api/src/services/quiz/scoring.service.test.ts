import { describe, it, expect } from "vitest";
import { scoreQuestion, computeFinalScore, type ScoringQuestion } from "./scoring.service.js";

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

describe("scoreQuestion", () => {
  /** SCORE-01: a single-answer question with the correct option selected scores 4. */
  it("scores 4 when the single correct option is selected", () => {
    expect(scoreQuestion(singleQuestion, ["a"])).toBe(4);
  });

  /** SCORE-01: a single-answer question with the wrong option selected scores 0. */
  it("scores 0 when a single-answer question's selection is wrong", () => {
    expect(scoreQuestion(singleQuestion, ["b"])).toBe(0);
  });

  /** SCORE-01: a multiple-answer question with all correct options selected (2/2) scores 4. */
  it("scores 4 when all correct options of a multiple question are selected", () => {
    expect(scoreQuestion(multipleQuestion, ["a", "b"])).toBe(4);
  });

  /** SCORE-01: a multiple-answer question with 1 of 2 correct options selected scores 2. */
  it("scores 2 when 1 of 2 correct options is selected", () => {
    expect(scoreQuestion(multipleQuestion, ["a"])).toBe(2);
  });

  /** SCORE-01: an extra wrong pick on a multiple question is not penalized. */
  it("does not penalize an extra wrong pick on a multiple question", () => {
    expect(scoreQuestion(multipleQuestion, ["a", "b", "c"])).toBe(4);
  });

  /** SCORE-04: no selected options scores 0 (models the "missing answer" case). */
  it("scores 0 when no options are selected", () => {
    expect(scoreQuestion(multipleQuestion, [])).toBe(0);
  });
});

describe("computeFinalScore", () => {
  /** SCORE-02: weighted average over 3 questions with weights 1.0, 1.1, 1.21. */
  it("matches the hand-computed weighted average for a 3-question example", () => {
    const scores = [4, 2, 0];
    const weights = [1.0, 1.1, 1.21];
    const expected =
      (scores[0] * weights[0] + scores[1] * weights[1] + scores[2] * weights[2]) /
      (weights[0] + weights[1] + weights[2]);

    expect(computeFinalScore(scores)).toBeCloseTo(expected, 10);
  });
});
