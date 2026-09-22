import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewQuizPage from "./quizzes-new";
import { quizClient, ApiError } from "@/lib/api-client";

const navigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    quizClient: { createQuiz: vi.fn(), submitQuiz: vi.fn(), listQuizzes: vi.fn() },
  };
});

const generatedQuiz = {
  id: "quiz-1",
  sourceUrl: "https://example.com/README.md",
  createdAt: "2026-01-01T00:00:00Z",
  questions: [],
};

describe("<NewQuizPage/>", () => {
  beforeEach(() => {
    navigate.mockClear();
    vi.mocked(quizClient.createQuiz).mockReset();
  });

  describe("given generation succeeds after a delay", () => {
    /**
     * The admin sees a busy state while waiting and is taken to the new quiz on success.
     * @scenario "generating shows a busy state and then opens the new quiz"
     */
    it("shows a busy button then opens the new quiz", async () => {
      let resolveCreate!: (value: typeof generatedQuiz) => void;
      vi.mocked(quizClient.createQuiz).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
      );
      const user = userEvent.setup();
      render(<NewQuizPage />);

      await user.type(screen.getByLabelText(/markdown document url/i), "https://example.com/README.md");
      await user.click(screen.getByRole("button", { name: /generate quiz/i }));

      expect(screen.getByRole("button", { name: /generating quiz/i })).toBeDisabled();

      resolveCreate(generatedQuiz);

      await waitFor(() => expect(navigate).toHaveBeenCalledWith("/quizzes/quiz-1"));
    });
  });

  describe("given generation stays pending", () => {
    /**
     * A long wait is explained with rotating progress labels.
     * @scenario "the busy button cycles through progress labels while generation is pending"
     */
    it("advances the busy label every 5 seconds", async () => {
      vi.useFakeTimers();
      vi.mocked(quizClient.createQuiz).mockReturnValueOnce(new Promise(() => undefined));
      render(<NewQuizPage />);

      fireEvent.change(screen.getByLabelText(/markdown document url/i), {
        target: { value: "https://example.com/README.md" },
      });
      fireEvent.click(screen.getByRole("button", { name: /generate quiz/i }));

      expect(screen.getByRole("button", { name: /generating quiz/i })).toBeDisabled();

      const labels = [
        /downloading document/i,
        /reading document/i,
        /generating questions/i,
        /thinking/i,
        /generating quiz/i,
      ];

      for (const label of labels) {
        act(() => vi.advanceTimersByTime(5_000));
        expect(screen.getByRole("button", { name: label })).toBeDisabled();
      }

      vi.useRealTimers();
    });
  });

  describe("given generation is rejected", () => {
    /**
     * The server's reason is shown and the admin's input is preserved for retry.
     * @scenario "a generation failure shows the server message and keeps the URL"
     */
    it("shows the reason, keeps the address, stays on the page", async () => {
      vi.mocked(quizClient.createQuiz).mockRejectedValueOnce(new ApiError(422, "source too large"));
      const user = userEvent.setup();
      render(<NewQuizPage />);

      const input = screen.getByLabelText(/markdown document url/i);
      await user.type(input, "https://example.com/README.md");
      await user.click(screen.getByRole("button", { name: /generate quiz/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/source too large/i);
      expect(input).toHaveValue("https://example.com/README.md");
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});
