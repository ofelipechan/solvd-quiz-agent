"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { quizClient, ApiError } from "@/lib/api-client";

// SPEC_DEVIATION: the spec's route surface (T18-T20) has no `GET
// /api/quizzes/:id` endpoint, so the quiz-taking page has no way to load a
// quiz it didn't just create. We hand it the freshly generated quiz via
// sessionStorage instead of a server round-trip.
// Reason: staying within this batch's touched files (no new API route) while
// still letting T25's page render the quiz after redirect.
const QUIZ_STORAGE_PREFIX = "quiz-agent:quiz:";

/** New-quiz form (UI-03/UI-05): generates a quiz from a source URL, then redirects to the quiz-taking page. */
export default function NewQuizPage() {
  const router = useRouter();
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const quiz = await quizClient.createQuiz({ sourceUrl });
      sessionStorage.setItem(`${QUIZ_STORAGE_PREFIX}${quiz.id}`, JSON.stringify(quiz));
      router.push(`/quizzes/${quiz.id}`);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Não foi possível gerar o quiz. Tente novamente.";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Novo quiz</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <label className="flex flex-col gap-1 text-sm">
          URL do documento Markdown
          <input
            type="url"
            name="sourceUrl"
            required
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer rounded bg-blue-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Gerando quiz..." : "Gerar quiz"}
        </button>
      </form>
    </main>
  );
}
