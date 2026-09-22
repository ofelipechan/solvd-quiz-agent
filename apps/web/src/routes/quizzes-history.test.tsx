import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import QuizHistoryPage from "./quizzes-history";
import { quizClient } from "@/lib/api-client";

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    quizClient: { createQuiz: vi.fn(), submitQuiz: vi.fn(), listQuizzes: vi.fn() },
  };
});

const twoQuizzes = [
  { id: "quiz-1", sourceUrl: "https://example.com/a.md", createdAt: "2026-01-01T00:00:00Z", finalScore: 3.5 },
  { id: "quiz-2", sourceUrl: "https://example.com/b.md", createdAt: "2026-01-02T00:00:00Z", finalScore: null },
];

describe("<QuizHistoryPage/>", () => {
  beforeEach(() => {
    vi.mocked(quizClient.listQuizzes).mockReset();
  });

  describe("given one submitted and one unsubmitted quiz", () => {
    /**
     * Each row tells the admin whether the quiz has a score yet.
     * @scenario "each quiz shows its score or that it is not yet submitted"
     */
    it("shows the score for one and not-yet-submitted for the other", async () => {
      vi.mocked(quizClient.listQuizzes).mockResolvedValueOnce(twoQuizzes);

      render(<QuizHistoryPage />);

      expect(await screen.findByText(/score: 87\.5%/i)).toBeInTheDocument();
      expect(await screen.findByText(/not yet submitted/i)).toBeInTheDocument();
    });

    /**
     * The mean score uses the same percentage scale as each row.
     * @scenario "the average score is shown as a percentage"
     */
    it("shows the average score as a percentage", async () => {
      vi.mocked(quizClient.listQuizzes).mockResolvedValueOnce([
        { ...twoQuizzes[0], finalScore: 3.5 },
        { ...twoQuizzes[1], finalScore: 2.5 },
      ]);

      render(<QuizHistoryPage />);

      expect(await screen.findByText("75.0%")).toBeInTheDocument();
    });

    /**
     * The row's link matches what the admin can still do with the quiz.
     * @scenario "unsubmitted quizzes link to take them and submitted ones to view results"
     */
    it("links view-results to the submitted and take-quiz to the unsubmitted quiz", async () => {
      vi.mocked(quizClient.listQuizzes).mockResolvedValueOnce(twoQuizzes);

      render(<QuizHistoryPage />);

      expect(await screen.findByRole("link", { name: /view results/i })).toHaveAttribute("href", "/quizzes/quiz-1");
      expect(screen.getByRole("link", { name: /take quiz/i })).toHaveAttribute("href", "/quizzes/quiz-2");
    });
  });
});
