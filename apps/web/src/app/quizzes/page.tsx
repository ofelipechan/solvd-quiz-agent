"use client";

import { useEffect, useState } from "react";
import { quizClient, ApiError, type QuizSummary } from "@/lib/api-client";

/** History page (HIST-01): lists quizzes with source URL, date, and final score or a "not yet submitted" state. */
export default function QuizHistoryPage() {
  const [quizzes, setQuizzes] = useState<QuizSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    quizClient
      .listQuizzes()
      .then(setQuizzes)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar o histórico."));
  }, []);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Histórico de quizzes</h1>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {quizzes === null && !error && <p>Carregando...</p>}
      {quizzes && quizzes.length === 0 && <p>Nenhum quiz gerado ainda.</p>}
      <ul className="flex flex-col gap-2">
        {quizzes?.map((quiz) => (
          <li key={quiz.id} className="rounded border border-gray-300 p-3">
            <p className="font-medium">{quiz.sourceUrl}</p>
            <p className="text-sm text-gray-600">{new Date(quiz.createdAt).toLocaleString("pt-BR")}</p>
            <p className="text-sm">
              {quiz.finalScore === null ? "Ainda não enviado" : `Pontuação: ${quiz.finalScore.toFixed(2)}`}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
