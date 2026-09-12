import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuizPage from "./page";
import { quizClient } from "@/lib/api-client";

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "quiz-1" }),
}));

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    quizClient: { createQuiz: vi.fn(), submitQuiz: vi.fn(), listQuizzes: vi.fn() },
  };
});

const singleQuiz = {
  id: "quiz-1",
  sourceUrl: "https://example.com/README.md",
  createdAt: "2026-01-01T00:00:00Z",
  questions: [
    {
      id: "q1",
      orderIndex: 1,
      text: "What is 2+2?",
      questionType: "single" as const,
      options: [
        { id: "o1", text: "3" },
        { id: "o2", text: "4" },
      ],
    },
  ],
};

const multiQuiz = {
  ...singleQuiz,
  questions: [
    {
      id: "q1",
      orderIndex: 1,
      text: "Pick even numbers",
      questionType: "multiple" as const,
      options: [
        { id: "o1", text: "2" },
        { id: "o2", text: "3" },
        { id: "o3", text: "4" },
      ],
    },
  ],
};

function seedQuiz(quiz: typeof singleQuiz) {
  sessionStorage.setItem(`quiz-agent:quiz:${quiz.id}`, JSON.stringify(quiz));
}

describe("QuizPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(quizClient.submitQuiz).mockReset();
  });

  /** Spec AC (UI-03): a single-answer question renders mutually-exclusive radio inputs. */
  it("renders radio inputs for a single-answer question", async () => {
    seedQuiz(singleQuiz);
    render(<QuizPage />);

    const options = await screen.findAllByRole("radio");
    expect(options).toHaveLength(2);
  });

  /** Spec AC (UI-04): a multiple-answer question renders checkbox inputs. */
  it("renders checkbox inputs for a multiple-answer question", async () => {
    seedQuiz(multiQuiz);
    render(<QuizPage />);

    const options = await screen.findAllByRole("checkbox");
    expect(options).toHaveLength(3);
  });

  /** Spec AC (UI-04): submitting shows per-question correctness and the final score. */
  it("shows correctness per question and the final score after submit", async () => {
    seedQuiz(singleQuiz);
    vi.mocked(quizClient.submitQuiz).mockResolvedValueOnce({
      answers: [{ questionId: "q1", correct: true, score: 4 }],
      finalScore: 4,
    });
    const user = userEvent.setup();
    render(<QuizPage />);

    const radios = await screen.findAllByRole("radio");
    await user.click(radios[1]);
    await user.click(screen.getByRole("button", { name: /enviar respostas/i }));

    expect(await screen.findByText(/correto/i)).toBeInTheDocument();
    expect(screen.getByText(/pontuação final: 4\.00/i)).toBeInTheDocument();
  });
});
