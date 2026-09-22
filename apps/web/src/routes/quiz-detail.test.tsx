import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuizPage from "./quiz-detail";
import { quizClient, ApiError } from "@/lib/api-client";

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "quiz-1" }),
}));

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    quizClient: { createQuiz: vi.fn(), submitQuiz: vi.fn(), listQuizzes: vi.fn(), getQuiz: vi.fn() },
  };
});

const singleQuiz = {
  id: "quiz-1",
  sourceUrl: "https://example.com/README.md",
  createdAt: "2026-01-01T00:00:00Z",
  submission: null,
  questions: [
    {
      id: "q1",
      orderIndex: 1,
      text: "What is 2+2?",
      questionType: "single" as const,
      weight: 20,
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
      weight: 100,
      options: [
        { id: "o1", text: "2" },
        { id: "o2", text: "3" },
        { id: "o3", text: "4" },
      ],
    },
  ],
};

const PICKED_FEEDBACK = "4 is what two plus two makes";

const submittedQuiz = {
  ...singleQuiz,
  submission: {
    finalScore: 4,
    submittedAt: "2026-01-02T00:00:00Z",
    answers: [
      {
        questionId: "q1",
        selectedOptionIds: ["o2"],
        score: 4,
        weight: 20,
        correct: true,
        correctOptionIds: ["o2"],
        selectedOptionFeedback: [{ optionId: "o2", feedback: PICKED_FEEDBACK }],
      },
    ],
  },
};

const partiallyScoredQuiz = {
  ...submittedQuiz,
  submission: { ...submittedQuiz.submission, finalScore: 3.5 },
};

function seedQuiz(quiz: typeof singleQuiz | typeof multiQuiz | typeof submittedQuiz | typeof partiallyScoredQuiz) {
  vi.mocked(quizClient.getQuiz).mockResolvedValueOnce(quiz);
}

describe("<QuizPage/>", () => {
  beforeEach(() => {
    vi.mocked(quizClient.submitQuiz).mockReset();
    vi.mocked(quizClient.getQuiz).mockReset();
  });

  describe("given an unsubmitted single-answer quiz", () => {
    /**
     * The page shows the quiz named in the address.
     * @scenario "the page loads the quiz named in the address"
     */
    it("loads quiz-1", async () => {
      seedQuiz(singleQuiz);
      render(<QuizPage />);

      await screen.findAllByRole("radio");
      expect(quizClient.getQuiz).toHaveBeenCalledWith("quiz-1");
    });

    /**
     * A single-answer question offers mutually exclusive choices.
     * @scenario "a single-answer question is shown as radios"
     */
    it("shows one radio per option", async () => {
      seedQuiz(singleQuiz);
      render(<QuizPage />);

      const options = await screen.findAllByRole("radio");
      expect(options).toHaveLength(2);
    });

    /**
     * After submitting, the admin sees which answers were right and the score.
     * @scenario "submitting shows per-question correctness and the final score"
     */
    it("marks the answer correct and shows the final score after submit", async () => {
      seedQuiz(singleQuiz);
      vi.mocked(quizClient.submitQuiz).mockResolvedValueOnce({
        answers: [
          {
            questionId: "q1",
            correct: true,
            score: 4,
            weight: 20,
            correctOptionIds: ["o2"],
            selectedOptionFeedback: [{ optionId: "o2", feedback: PICKED_FEEDBACK }],
          },
        ],
        finalScore: 4,
      });
      const user = userEvent.setup();
      render(<QuizPage />);

      const radios = await screen.findAllByRole("radio");
      await user.click(radios[1]);
      await user.click(screen.getByRole("button", { name: /submit answers/i }));

      expect(await screen.findByText(/correct/i)).toBeInTheDocument();
      expect(screen.getByText(/final score: 100\.0%/i)).toBeInTheDocument();
      expect(screen.getByText("✓")).toBeInTheDocument();
    });

    /**
     * Stakes stay hidden until the answers are revealed.
     * @scenario "weights are hidden while answering"
     */
    it("shows no weight before submitting", async () => {
      seedQuiz(singleQuiz);
      render(<QuizPage />);

      await screen.findAllByRole("radio");
      expect(screen.queryByText(/weight/i)).not.toBeInTheDocument();
    });

    /**
     * Before submitting, an explanation would give the answer away.
     * @scenario "no explanation is shown while answering"
     */
    it("shows no explanation before submitting", async () => {
      seedQuiz(singleQuiz);
      render(<QuizPage />);

      const radios = await screen.findAllByRole("radio");
      radios.forEach((radio) => expect(radio).not.toHaveAccessibleDescription());
    });
  });

  describe("given an unsubmitted multiple-answer quiz", () => {
    /**
     * A multiple-answer question allows several picks.
     * @scenario "a multiple-answer question is shown as checkboxes"
     */
    it("shows one checkbox per option", async () => {
      seedQuiz(multiQuiz);
      render(<QuizPage />);

      const options = await screen.findAllByRole("checkbox");
      expect(options).toHaveLength(3);
    });
  });

  describe("given an already-submitted quiz", () => {
    /**
     * A finished quiz opens read-only with the result visible.
     * @scenario "an already-submitted quiz opens in review mode"
     */
    it("opens read-only with the selection, the score, and no submit", async () => {
      seedQuiz(submittedQuiz);
      render(<QuizPage />);

      const radios = await screen.findAllByRole("radio");
      expect(radios[1]).toBeChecked();
      radios.forEach((radio) => expect(radio).toBeDisabled());
      expect(screen.getByText("✓")).toBeInTheDocument();
      expect(screen.getByText(/final score: 100\.0%/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /submit answers/i })).not.toBeInTheDocument();
    });

    /**
     * The 0-4 score is shown as a percentage with one decimal.
     * @scenario "the final score is shown as a percentage with one decimal"
     */
    it("shows 3.5 as 87.5%", async () => {
      seedQuiz(partiallyScoredQuiz);
      render(<QuizPage />);

      expect(await screen.findByText(/final score: 87\.5%/i)).toBeInTheDocument();
    });

    /**
     * The scoring rule is explained so the number is not a mystery.
     * @scenario "the results explain how the final score is weighted"
     */
    it("explains the weighted average without the old 10% step", async () => {
      seedQuiz(submittedQuiz);
      render(<QuizPage />);

      expect(await screen.findByText(/weighted average.*question weights/i)).toBeInTheDocument();
      expect(screen.queryByText(/10% more than the previous one/i)).not.toBeInTheDocument();
    });

    /**
     * Review is where the admin learns why their pick was right or wrong.
     * @scenario "reviewing explains every option the admin picked"
     */
    it("shows the explanation for the picked option", async () => {
      seedQuiz(submittedQuiz);
      render(<QuizPage />);

      expect(await screen.findByText(PICKED_FEEDBACK)).toBeInTheDocument();
    });

    /**
     * Explaining an option nobody picked would hand over the rest of the answer key.
     * @scenario "an option the admin did not pick is not explained"
     */
    it("shows no explanation on the option left alone", async () => {
      seedQuiz(submittedQuiz);
      render(<QuizPage />);

      const radios = await screen.findAllByRole("radio");
      expect(radios[1]).toHaveAccessibleDescription(expect.stringContaining(PICKED_FEEDBACK));
      expect(radios[0]).not.toHaveAccessibleDescription();
    });

    /**
     * In review, each question says how much it counted.
     * @scenario "each reviewed question shows its weight"
     */
    it("shows the question weight", async () => {
      seedQuiz(submittedQuiz);
      render(<QuizPage />);

      expect(await screen.findByText(/weight: 20%/i)).toBeInTheDocument();
    });
  });

  describe("given the quiz cannot be found", () => {
    /**
     * An unknown quiz gets a clear message instead of a blank page.
     * @scenario "an unknown quiz shows a not-found message"
     */
    it("shows the not-found message", async () => {
      vi.mocked(quizClient.getQuiz).mockRejectedValueOnce(new ApiError(404, "quiz not found"));
      render(<QuizPage />);

      expect(await screen.findByText(/quiz not found/i)).toBeInTheDocument();
    });
  });
});
