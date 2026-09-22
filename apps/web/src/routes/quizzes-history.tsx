import { useEffect, useState } from "react";
import { quizClient, ApiError, type QuizSummary } from "@/lib/api-client";
import { computeQuizStats } from "@/lib/helpers/quiz-stats";
import { formatDateTime } from "@/lib/helpers/format-date";
import { Button } from "@/components/forms/controls/button";
import { Alert } from "@/components/shared/elements/alert";
import { Card } from "@/components/shared/elements/card";
import { Skeleton } from "@/components/shared/elements/skeleton";
import { StatItem } from "@/components/shared/elements/stat-item";
import { PageHeader } from "@/components/shared/sections/page-header";

function ScoreChip({ finalScore }: { finalScore: number | null }) {
  if (finalScore === null) {
    return (
      <span className="inline-flex items-center rounded-pill border border-warm-300 px-3 py-1 text-sm text-warm-400">
        Not yet submitted
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-pill bg-lime-200 px-3 py-1 text-sm font-medium text-ink">
      Score: {finalScore.toFixed(2)}
    </span>
  );
}

/** Row action: unsubmitted quizzes can still be taken; submitted ones open in review (HIST-02/HIST-03). */
function QuizRowAction({ quiz }: { quiz: QuizSummary }) {
  const submitted = quiz.finalScore !== null;
  return (
    <Button href={`/quizzes/${quiz.id}`} variant={submitted ? "outline" : "primary"} size="sm">
      {submitted ? "View results" : "Take quiz"}
    </Button>
  );
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading quiz history">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

/** History page (HIST-01): lists quizzes with source URL, date, and final score or a "not yet submitted" state. */
export default function QuizHistoryPage() {
  const [quizzes, setQuizzes] = useState<QuizSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    quizClient
      .listQuizzes()
      .then(setQuizzes)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load history."));
  }, []);

  const stats = quizzes ? computeQuizStats(quizzes) : null;

  return (
    <div className="flex flex-col gap-fluid-lg">
      <PageHeader
        eyebrow="Proof of progress"
        title="Quiz history"
        description="Every quiz you generated, when you took it, and how it went."
        actions={
          <Button href="/quizzes/new" variant="primary">
            New quiz
          </Button>
        }
      />

      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <StatItem value={stats.total} label="quizzes generated" />
          <StatItem value={stats.submitted} label="submitted" />
          <StatItem
            value={stats.averageScore === null ? "—" : stats.averageScore.toFixed(2)}
            label="average score"
          />
        </div>
      )}

      {error && <Alert tone="error">{error}</Alert>}

      {quizzes === null && !error && <HistorySkeleton />}

      {quizzes && quizzes.length === 0 && (
        <Card tone="mist" dots className="flex flex-col items-start gap-4 p-8 sm:p-10">
          <p className="font-serif text-h4">No quiz generated yet.</p>
          <p className="max-w-md text-body opacity-80">
            Paste a Markdown URL and Quiz Agent drafts a short quiz you can take right away.
          </p>
          <Button href="/quizzes/new">Generate your first quiz</Button>
        </Card>
      )}

      {quizzes && quizzes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {quizzes.map((quiz) => (
            <li key={quiz.id}>
              <Card className="flex flex-col gap-4 transition-colors duration-150 hover:border-forest-300 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink" title={quiz.sourceUrl}>
                    {quiz.sourceUrl}
                  </p>
                  <p className="mt-1 text-sm text-warm-400">{formatDateTime(quiz.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <ScoreChip finalScore={quiz.finalScore} />
                  <QuizRowAction quiz={quiz} />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
