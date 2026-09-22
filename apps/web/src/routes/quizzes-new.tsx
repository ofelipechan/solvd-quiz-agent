import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { quizClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/forms/controls/button";
import { Input } from "@/components/forms/controls/input";
import { Alert } from "@/components/shared/elements/alert";
import { Card } from "@/components/shared/elements/card";
import { CheckList } from "@/components/shared/elements/check-list";
import { Eyebrow } from "@/components/shared/elements/eyebrow";

const highlights = [
  "5–8 questions drafted from the document",
  "Single and multiple-choice formats",
  "Instant scoring with per-question feedback",
];

const generationLabels = [
  "Generating quiz...",
  "Downloading document...",
  "Reading document...",
  "Generating questions...",
  "Thinking...",
];

/** New-quiz form (UI-03/UI-05): generates a quiz from a source URL, then redirects to the quiz-taking page. */
export default function NewQuizPage() {
  const navigate = useNavigate();
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generationLabelIndex, setGenerationLabelIndex] = useState(0);

  useEffect(() => {
    if (!submitting) return;

    const intervalId = window.setInterval(() => {
      setGenerationLabelIndex((currentIndex) => (currentIndex + 1) % generationLabels.length);
    }, 5_000);

    return () => window.clearInterval(intervalId);
  }, [submitting]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setGenerationLabelIndex(0);
    setSubmitting(true);
    try {
      const quiz = await quizClient.createQuiz({ sourceUrl });
      navigate(`/quizzes/${quiz.id}`);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Could not generate the quiz. Please try again.";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-fluid-lg lg:grid-cols-[5fr_6fr] lg:items-start">
      <section>
        <Eyebrow className="mb-3">Generate</Eyebrow>
        <h1 className="text-h2 text-balance">
          Paste a Markdown URL. <span className="text-forest-400">Get a quiz.</span>
        </h1>
        <p className="mt-4 max-w-lg text-lead opacity-80">
          Point Quiz Agent at any public Markdown document (e.g. a README, a spec, a blog post) and it drafts a
          short quiz you can take right away.
        </p>
        <CheckList items={highlights} className="mt-8" />
      </section>

      <Card tone="mist" dots className="p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
          <Input
            id="sourceUrl"
            label="Markdown document URL"
            type="url"
            name="sourceUrl"
            inputMode="url"
            autoComplete="off"
            required
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            hint="Raw GitHub URLs work best, e.g. https://raw.githubusercontent.com/…/README.md"
          />

          {error && (
            <Alert tone="error" className="mt-4">
              {error}
            </Alert>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <Button type="submit" size="lg" loading={submitting} fullWidth>
              {submitting ? generationLabels[generationLabelIndex] : "Generate quiz"}
            </Button>
            <p className="min-h-5 text-center text-sm text-warm-400" aria-live="polite">
              {submitting ? "Reading the document and drafting questions — usually under 30 seconds." : ""}
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}
