import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { quizClient, ApiError, type QuizDetail } from "@/lib/api-client";
import type { AnswerResult, QuizSubmission } from "@/lib/types/api";
import { Button } from "@/components/forms/controls/button";
import { Alert } from "@/components/shared/elements/alert";
import { Card } from "@/components/shared/elements/card";
import { Skeleton } from "@/components/shared/elements/skeleton";
import { PageHeader } from "@/components/shared/sections/page-header";
import { QuestionCard } from "@/components/quiz/sections/question-card";
import { ScoreBanner } from "@/components/quiz/sections/score-banner";

type SelectedAnswers = Record<string, string[]>;

interface ReviewState {
  answers: AnswerResult[];
  finalScore: number;
}

function toggleSingle(optionId: string): string[] {
  return [optionId];
}

function toggleMultiple(current: string[], optionId: string): string[] {
  return current.includes(optionId) ? current.filter((id) => id !== optionId) : [...current, optionId];
}

/** Rebuilds the selection map and review state from a persisted submission (HIST-03). */
function fromSubmission(submission: QuizSubmission): { selected: SelectedAnswers; review: ReviewState } {
  const selected: SelectedAnswers = {};
  submission.answers.forEach((a) => {
    selected[a.questionId] = a.selectedOptionIds;
  });
  return { selected, review: { answers: submission.answers, finalScore: submission.finalScore } };
}

function QuizSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading quiz">
      <Skeleton className="h-10 w-1/2" />
      <Skeleton className="h-48" />
      <Skeleton className="h-48" />
    </div>
  );
}

/**
 * Quiz-taking + review page (UI-03/UI-04, HIST-02/03): loads the quiz by id,
 * renders radios for `single` / checkboxes for `multiple`, and either takes
 * answers (unsubmitted) or opens straight into review with the persisted
 * selections, correct answers, and final score (submitted).
 */
export default function QuizPage() {
  const { id } = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<QuizDetail | null | undefined>(undefined);
  const [selected, setSelected] = useState<SelectedAnswers>({});
  const [review, setReview] = useState<ReviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    quizClient
      .getQuiz(id)
      .then((detail) => {
        if (cancelled) return;
        setQuiz(detail);
        if (detail.submission) {
          const restored = fromSubmission(detail.submission);
          setSelected(restored.selected);
          setReview(restored.review);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setQuiz(null);
        } else {
          setQuiz(null);
          setError(err instanceof ApiError ? err.message : "Could not load the quiz.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const reviewByQuestion = useMemo(() => {
    const map = new Map<string, AnswerResult>();
    review?.answers.forEach((a) => map.set(a.questionId, a));
    return map;
  }, [review]);

  const answeredCount = quiz ? quiz.questions.filter((q) => (selected[q.id] ?? []).length > 0).length : 0;
  const correctCount = review ? review.answers.filter((a) => a.correct).length : 0;

  function handleOptionChange(questionId: string, optionId: string, questionType: "single" | "multiple") {
    setSelected((prev) => {
      const current = prev[questionId] ?? [];
      const next = questionType === "single" ? toggleSingle(optionId) : toggleMultiple(current, optionId);
      return { ...prev, [questionId]: next };
    });
  }

  async function handleSubmit() {
    if (!quiz) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await quizClient.submitQuiz(quiz.id, {
        answers: quiz.questions.map((q) => ({
          questionId: q.id,
          selectedOptionIds: selected[q.id] ?? [],
        })),
      });
      setReview(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit your answers.");
    } finally {
      setSubmitting(false);
    }
  }

  if (quiz === undefined) {
    return <QuizSkeleton />;
  }

  if (quiz === null) {
    return (
      <Card tone="mist" dots className="flex flex-col items-start gap-4 p-8 sm:p-10">
        <p className="font-serif text-h4">{error ? "Could not load this quiz." : "Quiz not found."}</p>
        <p className="max-w-md text-body opacity-80">
          {error ?? "It may have been removed. Pick another one from your history or generate a new quiz."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button href="/quizzes" variant="outline">
            Back to history
          </Button>
          <Button href="/quizzes/new">Generate a quiz</Button>
        </div>
      </Card>
    );
  }

  const total = quiz.questions.length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-fluid-md">
      <PageHeader
        eyebrow={review ? "Review" : "Quiz"}
        title={review ? "How you did" : "Answer every question"}
        description={
          <span className="block truncate" title={quiz.sourceUrl}>
            Source: {quiz.sourceUrl}
          </span>
        }
      />

      {review && <ScoreBanner finalScore={review.finalScore} correctCount={correctCount} total={total} />}

      <div className="flex flex-col gap-5">
        {quiz.questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            index={index}
            question={question}
            selected={selected[question.id] ?? []}
            result={reviewByQuestion.get(question.id)}
            disabled={Boolean(review)}
            onToggle={(optionId) => handleOptionChange(question.id, optionId, question.questionType)}
          />
        ))}
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {!review && (
        <div className="sticky bottom-0 -mx-5 border-t border-warm-200 bg-white/90 px-5 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
          <div className="flex items-center justify-between gap-4">
            <p className="text-ui text-warm-400" aria-live="polite">
              {answeredCount} of {total} answered
            </p>
            <Button type="button" size="lg" onClick={handleSubmit} loading={submitting}>
              {submitting ? "Submitting..." : "Submit answers"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
