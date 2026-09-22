import type { AnswerResult } from "@/lib/types/api";
import type { PublicQuestion } from "@/lib/api-client";
import { cn } from "@/lib/helpers/cn";
import { formatWeight } from "@/lib/helpers/score-percentage";
import { OptionRow, type OptionReviewState } from "@/components/quiz/controls/option-row";

interface QuestionCardProps {
  index: number;
  question: PublicQuestion;
  selected: string[];
  result?: AnswerResult;
  disabled: boolean;
  onToggle: (optionId: string) => void;
}

function reviewStateFor(result: AnswerResult | undefined, optionId: string): OptionReviewState {
  if (!result) return "none";
  return result.correctOptionIds.includes(optionId) ? "correct" : "missed";
}

/**
 * The feedback for one option, or undefined when there is none to show. The
 * API only sends feedback for the options the admin picked, so an untouched
 * option keeps its explanation hidden.
 */
function feedbackFor(result: AnswerResult | undefined, optionId: string): string | undefined {
  return result?.selectedOptionFeedback.find((entry) => entry.optionId === optionId)?.feedback;
}

/** One question as a numbered card: serif prompt, option rows, and the per-question verdict after submit. */
export function QuestionCard({ index, question, selected, result, disabled, onToggle }: QuestionCardProps) {
  const number = String(index + 1).padStart(2, "0");
  const kindLabel = question.questionType === "single" ? "Pick one" : "Pick all that apply";

  return (
    <fieldset
      className={cn(
        "rounded-card border bg-white p-5 sm:p-7",
        result ? (result.correct ? "border-lime-500" : "border-ember-500") : "border-warm-200",
      )}
    >
      <legend className="float-left flex w-full items-start gap-4">
        <span className="mt-1 shrink-0 font-serif text-h5 leading-none text-forest-400">{number}</span>
        <span className="min-w-0 flex-1 font-serif text-h4 text-balance">{question.text}</span>
      </legend>
      <p className="clear-both mt-1.5 mb-5 pl-[calc(var(--text-h5)+1rem)] text-sm tracking-wider text-warm-400 uppercase">
        {kindLabel}
      </p>

      <div className="flex flex-col gap-2">
        {question.options.map((option) => (
          <OptionRow
            key={option.id}
            id={`${question.id}-${option.id}`}
            name={question.id}
            text={option.text}
            kind={question.questionType}
            checked={selected.includes(option.id)}
            disabled={disabled}
            review={reviewStateFor(result, option.id)}
            feedback={feedbackFor(result, option.id)}
            onChange={() => onToggle(option.id)}
          />
        ))}
      </div>

      {result && (
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p
            className={cn(
              "inline-flex items-center gap-2 text-ui font-medium",
              result.correct ? "text-forest-deep" : "text-ember-700",
            )}
          >
            {result.correct ? "Correct" : "Incorrect"} — {result.score.toFixed(2)} points
          </p>
          <p className="text-sm text-warm-400">Weight: {formatWeight(result.weight)}</p>
        </div>
      )}
    </fieldset>
  );
}
