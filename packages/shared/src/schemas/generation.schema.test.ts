import { describe, it, expect } from "vitest";
import { GeneratedQuizSchema } from "./generation.schema.js";

/**
 * A minimal valid question template. Tests mutate this per-case so each
 * assertion isolates exactly one violated rule from the spec's schema rules.
 */
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

function quizOf(questions: ReturnType<typeof validQuestion>[]) {
  return { questions };
}

/** A quiz with 5 valid, distinct questions - the minimum accepted count. */
function fiveValidQuestions() {
  return Array.from({ length: 5 }, (_, i) =>
    validQuestion({
      text: `Question number ${i + 1}?`,
      options: [
        { text: `Q${i}-Option A`, isCorrect: true },
        { text: `Q${i}-Option B`, isCorrect: false },
        { text: `Q${i}-Option C`, isCorrect: false },
        { text: `Q${i}-Option D`, isCorrect: false },
      ],
    }),
  );
}

describe("GeneratedQuizSchema", () => {
  /** Design: a quiz with 5-8 questions, each with exactly 4 options and a valid correct-count/type match, is accepted. */
  it("accepts a valid quiz with 5 well-formed questions", () => {
    const result = GeneratedQuizSchema.safeParse(quizOf(fiveValidQuestions()));
    expect(result.success).toBe(true);
  });

  /** Spec AC (GEN-01): every question must have exactly 4 answer options. */
  it("rejects a question with only 3 options", () => {
    const questions = fiveValidQuestions();
    questions[0] = validQuestion({
      options: [
        { text: "A", isCorrect: true },
        { text: "B", isCorrect: false },
        { text: "C", isCorrect: false },
      ],
    });
    const result = GeneratedQuizSchema.safeParse(quizOf(questions));
    expect(result.success).toBe(false);
  });

  /** Design refine rule: a `single` question must have exactly one correct option. */
  it("rejects a single-type question with 2 correct options", () => {
    const questions = fiveValidQuestions();
    questions[0] = validQuestion({
      questionType: "single",
      options: [
        { text: "A", isCorrect: true },
        { text: "B", isCorrect: true },
        { text: "C", isCorrect: false },
        { text: "D", isCorrect: false },
      ],
    });
    const result = GeneratedQuizSchema.safeParse(quizOf(questions));
    expect(result.success).toBe(false);
  });

  /** Design refine rule: a `multiple` question must have at least 2 correct options. */
  it("rejects a multiple-type question with only 1 correct option", () => {
    const questions = fiveValidQuestions();
    questions[0] = validQuestion({
      questionType: "multiple",
      options: [
        { text: "A", isCorrect: true },
        { text: "B", isCorrect: false },
        { text: "C", isCorrect: false },
        { text: "D", isCorrect: false },
      ],
    });
    const result = GeneratedQuizSchema.safeParse(quizOf(questions));
    expect(result.success).toBe(false);
  });

  /** Risks table refine: duplicate option text within a question is rejected. */
  it("rejects a question with duplicate option text", () => {
    const questions = fiveValidQuestions();
    questions[0] = validQuestion({
      options: [
        { text: "Same text", isCorrect: true },
        { text: "Same text", isCorrect: false },
        { text: "C", isCorrect: false },
        { text: "D", isCorrect: false },
      ],
    });
    const result = GeneratedQuizSchema.safeParse(quizOf(questions));
    expect(result.success).toBe(false);
  });

  /** Spec AC (GEN-01): a quiz must have between 5 and 8 questions - fewer than 5 is rejected. */
  it("rejects a quiz with fewer than 5 questions", () => {
    const result = GeneratedQuizSchema.safeParse(quizOf(fiveValidQuestions().slice(0, 4)));
    expect(result.success).toBe(false);
  });

  /** Spec AC (GEN-01): a quiz must have between 5 and 8 questions - more than 8 is rejected. */
  it("rejects a quiz with more than 8 questions", () => {
    const nine = Array.from({ length: 9 }, (_, i) =>
      validQuestion({
        text: `Question number ${i + 1}?`,
        options: [
          { text: `Q${i}-A`, isCorrect: true },
          { text: `Q${i}-B`, isCorrect: false },
          { text: `Q${i}-C`, isCorrect: false },
          { text: `Q${i}-D`, isCorrect: false },
        ],
      }),
    );
    const result = GeneratedQuizSchema.safeParse(quizOf(nine));
    expect(result.success).toBe(false);
  });
});
