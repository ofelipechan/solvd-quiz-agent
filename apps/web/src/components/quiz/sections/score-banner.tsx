import { ParticleBackdrop } from "@/components/shared/elements/particle-backdrop";
import { Eyebrow } from "@/components/shared/elements/eyebrow";
import { Button } from "@/components/forms/controls/button";

interface ScoreBannerProps {
  finalScore: number;
  correctCount: number;
  total: number;
}

export function ScoreBanner({ finalScore, correctCount, total }: ScoreBannerProps) {
  return (
    <section className="is-dark relative isolate overflow-hidden rounded-card bg-forest-800 px-6 py-10 text-white sm:px-10">
      <ParticleBackdrop opacity={0.25} />
      <Eyebrow className="mb-3">Results</Eyebrow>
      <p className="font-serif text-h2 text-balance">Final score: {finalScore.toFixed(2)}</p>
      <p className="mt-3 text-lead text-forest-300">
        {correctCount} of {total} questions right.
      </p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-forest-300">
        Weighted average: each question is worth 10% more than the previous one.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button href="/quizzes/new" variant="white">
          Generate another quiz
        </Button>
        <Button href="/quizzes" variant="outline">
          View history
        </Button>
      </div>
    </section>
  );
}
