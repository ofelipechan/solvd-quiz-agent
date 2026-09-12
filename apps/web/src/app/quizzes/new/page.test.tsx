import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewQuizPage from "./page";
import { quizClient, ApiError } from "@/lib/api-client";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
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

describe("NewQuizPage", () => {
  beforeEach(() => {
    push.mockClear();
    vi.mocked(quizClient.createQuiz).mockReset();
  });

  /** Spec AC (UI-03): submitting a URL shows a loading state, then redirects on success. */
  it("shows a loading state while generating, then redirects on success", async () => {
    let resolveCreate!: (value: typeof generatedQuiz) => void;
    vi.mocked(quizClient.createQuiz).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<NewQuizPage />);

    await user.type(screen.getByLabelText(/url do documento/i), "https://example.com/README.md");
    await user.click(screen.getByRole("button", { name: /gerar quiz/i }));

    expect(screen.getByRole("button", { name: /gerando quiz/i })).toBeDisabled();

    resolveCreate(generatedQuiz);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/quizzes/quiz-1"));
  });

  /** Spec AC (UI-05): an API error shows a message and preserves the URL input. */
  it("shows a server error and preserves the URL input on failure", async () => {
    vi.mocked(quizClient.createQuiz).mockRejectedValueOnce(new ApiError(422, "source too large"));
    const user = userEvent.setup();
    render(<NewQuizPage />);

    const input = screen.getByLabelText(/url do documento/i);
    await user.type(input, "https://example.com/README.md");
    await user.click(screen.getByRole("button", { name: /gerar quiz/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/source too large/i);
    expect(input).toHaveValue("https://example.com/README.md");
    expect(push).not.toHaveBeenCalled();
  });
});
