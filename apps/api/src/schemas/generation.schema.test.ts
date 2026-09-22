import { describe, expect, it } from "vitest";
import { GeneratedQuizSchema } from "./generation.schema.js";

function validQuestion(overrides: Partial<{
  text: string;
  questionType: "single" | "multiple";
  options: { text: string; isCorrect: boolean }[];
}> = {}) {
  return {
    text: "What does this project do?",
    questionType: "single" as const,
    options: [
      { text: "Option A", isCorrect: true },
      { text: "Option B", isCorrect: false },
      { text: "Option C", isCorrect: false },
      { text: "Option D", isCorrect: false },
    ],
    ...overrides,
  };
}

function fiveValidQuestions() {
  return Array.from({ length: 5 }, (_, index) =>
    validQuestion({
      text: `Question number ${index + 1}?`,
      options: [
        { text: `Q${index}-Option A`, isCorrect: true },
        { text: `Q${index}-Option B`, isCorrect: false },
        { text: `Q${index}-Option C`, isCorrect: false },
        { text: `Q${index}-Option D`, isCorrect: false },
      ],
    }),
  );
}

describe("GeneratedQuizSchema", () => {
  /**
   * A generated quiz with 5 valid questions passes validation.
   * @scenario "a quiz with 5 well-formed questions is accepted"
   */
  it("accepts five well-formed questions", () => {
    expect(GeneratedQuizSchema.safeParse({ questions: fiveValidQuestions() }).success).toBe(true);
  });

  /**
   * Every question must offer exactly 4 options.
   * @scenario "a question with only 3 options is rejected"
   */
  it("rejects a question with three options", () => {
    const questions = fiveValidQuestions();
    questions[0] = validQuestion({
      options: [
        { text: "A", isCorrect: true },
        { text: "B", isCorrect: false },
        { text: "C", isCorrect: false },
      ],
    });
    expect(GeneratedQuizSchema.safeParse({ questions }).success).toBe(false);
  });

  /**
   * A single-answer question has exactly one correct option.
   * @scenario "a single-answer question with 2 correct options is rejected"
   */
  it("rejects a single-answer question with two correct options", () => {
    const questions = fiveValidQuestions();
    questions[0] = validQuestion({
      options: [
        { text: "A", isCorrect: true },
        { text: "B", isCorrect: true },
        { text: "C", isCorrect: false },
        { text: "D", isCorrect: false },
      ],
    });
    expect(GeneratedQuizSchema.safeParse({ questions }).success).toBe(false);
  });

  /**
   * A multiple-answer question has at least two correct options.
   * @scenario "a multiple-answer question with only 1 correct option is rejected"
   */
  it("rejects a multiple-answer question with one correct option", () => {
    const questions = fiveValidQuestions();
    questions[0] = validQuestion({ questionType: "multiple" });
    expect(GeneratedQuizSchema.safeParse({ questions }).success).toBe(false);
  });

  /**
   * Option texts within a question are unique.
   * @scenario "a question with duplicate option text is rejected"
   */
  it("rejects repeated option text", () => {
    const questions = fiveValidQuestions();
    questions[0] = validQuestion({
      options: [
        { text: "Same text", isCorrect: true },
        { text: "Same text", isCorrect: false },
        { text: "C", isCorrect: false },
        { text: "D", isCorrect: false },
      ],
    });
    expect(GeneratedQuizSchema.safeParse({ questions }).success).toBe(false);
  });

  /**
   * A quiz has at least 5 questions.
   * @scenario "a quiz with fewer than 5 questions is rejected"
   */
  it("rejects fewer than five questions", () => {
    expect(GeneratedQuizSchema.safeParse({ questions: fiveValidQuestions().slice(0, 4) }).success).toBe(false);
  });

  /**
   * A quiz has at most 8 questions.
   * @scenario "a quiz with more than 8 questions is rejected"
   */
  it("rejects more than eight questions", () => {
    const questions = Array.from({ length: 9 }, (_, index) =>
      validQuestion({
        text: `Question number ${index + 1}?`,
        options: [
          { text: `Q${index}-A`, isCorrect: true },
          { text: `Q${index}-B`, isCorrect: false },
          { text: `Q${index}-C`, isCorrect: false },
          { text: `Q${index}-D`, isCorrect: false },
        ],
      }),
    );
    expect(GeneratedQuizSchema.safeParse({ questions }).success).toBe(false);
  });
});
