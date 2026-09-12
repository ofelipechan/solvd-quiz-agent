import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import QuizHistoryPage from "./page";
import { quizClient } from "@/lib/api-client";

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    quizClient: { createQuiz: vi.fn(), submitQuiz: vi.fn(), listQuizzes: vi.fn() },
  };
});

describe("QuizHistoryPage", () => {
  beforeEach(() => {
    vi.mocked(quizClient.listQuizzes).mockReset();
  });

  /** Spec AC (HIST-01): renders 2 quizzes, one showing a score and one showing "not yet submitted". */
  it("renders 2 quizzes, one with a score and one not yet submitted", async () => {
    vi.mocked(quizClient.listQuizzes).mockResolvedValueOnce([
      { id: "quiz-1", sourceUrl: "https://example.com/a.md", createdAt: "2026-01-01T00:00:00Z", finalScore: 3.5 },
      { id: "quiz-2", sourceUrl: "https://example.com/b.md", createdAt: "2026-01-02T00:00:00Z", finalScore: null },
    ]);

    render(<QuizHistoryPage />);

    expect(await screen.findByText(/pontuação: 3\.50/i)).toBeInTheDocument();
    expect(await screen.findByText(/ainda não enviado/i)).toBeInTheDocument();
  });
});
