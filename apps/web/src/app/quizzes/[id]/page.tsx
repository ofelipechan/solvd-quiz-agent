"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { quizClient, ApiError, type PublicQuiz } from "@/lib/api-client";
import type { AnswerResult } from "@quiz-agent/shared";

// SPEC_DEVIATION: see the matching note in app/quizzes/new/page.tsx — this
// page reads the quiz from sessionStorage instead of a GET /api/quizzes/:id
// endpoint, which the route surface (T18-T20) does not define.
const QUIZ_STORAGE_PREFIX = "quiz-agent:quiz:";

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

/** Quiz-taking + review page (UI-03/UI-04): renders radios for `single`, checkboxes for `multiple`, then shows per-question correctness + final score after one submit. */
export default function QuizPage() {
  const params = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<PublicQuiz | null | undefined>(undefined);
  const [selected, setSelected] = useState<SelectedAnswers>({});
  const [review, setReview] = useState<ReviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(`${QUIZ_STORAGE_PREFIX}${params.id}`);
    setQuiz(raw ? (JSON.parse(raw) as PublicQuiz) : null);
  }, [params.id]);

  const reviewByQuestion = useMemo(() => {
    const map = new Map<string, AnswerResult>();
    review?.answers.forEach((a) => map.set(a.questionId, a));
    return map;
  }, [review]);

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
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar suas respostas.");
    } finally {
      setSubmitting(false);
    }
  }

  if (quiz === undefined) {
    return <main className="p-6">Carregando...</main>;
  }

  if (quiz === null) {
    return <main className="p-6">Quiz não encontrado.</main>;
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Quiz</h1>
      {quiz.questions.map((question) => {
        const result = reviewByQuestion.get(question.id);
        return (
          <fieldset key={question.id} className="flex flex-col gap-2 rounded border border-gray-300 p-4">
            <legend className="font-medium">{question.text}</legend>
            {question.options.map((option) => {
              const checked = (selected[question.id] ?? []).includes(option.id);
              return (
                <label key={option.id} className="flex items-center gap-2 text-sm">
                  <input
                    type={question.questionType === "single" ? "radio" : "checkbox"}
                    name={question.id}
                    checked={checked}
                    disabled={Boolean(review)}
                    onChange={() => handleOptionChange(question.id, option.id, question.questionType)}
                  />
                  {option.text}
                </label>
              );
            })}
            {result && (
              <p className={result.correct ? "text-sm text-green-700" : "text-sm text-red-700"}>
                {result.correct ? "Correto" : "Incorreto"} — {result.score.toFixed(2)} pontos
              </p>
            )}
          </fieldset>
        );
      })}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {review ? (
        <p className="text-lg font-semibold">Pontuação final: {review.finalScore.toFixed(2)}</p>
      ) : (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Enviando..." : "Enviar respostas"}
        </button>
      )}
    </main>
  );
}
