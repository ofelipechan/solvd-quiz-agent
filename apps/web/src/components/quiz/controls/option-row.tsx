import { cn } from "@/lib/helpers/cn";
import { Checkbox } from "@/components/forms/controls/checkbox";
import { Radio } from "@/components/forms/controls/radio";

export type OptionReviewState = "correct" | "missed" | "none";

interface OptionRowProps {
  id: string;
  name: string;
  text: string;
  kind: "single" | "multiple";
  checked: boolean;
  disabled?: boolean;
  /** After submit: whether this option is one of the correct answers. */
  review?: OptionReviewState;
  /** After submit: why this option is right or wrong. Only passed for options the admin picked. */
  feedback?: string;
  onChange: () => void;
}

/** One selectable answer: a full-width row with a custom radio/checkbox and hover feedback. */
export function OptionRow({
  id,
  name,
  text,
  kind,
  checked,
  disabled,
  review = "none",
  feedback,
  onChange,
}: OptionRowProps) {
  const Control = kind === "single" ? Radio : Checkbox;
  const isReviewed = review !== "none";
  const feedbackId = `${id}-feedback`;
  const hasFeedback = Boolean(feedback);
  /** A checked box stays lime whatever the verdict, so a wrong pick says so in its own badge. */
  const isWrongPick = review === "missed" && checked;

  return (
    <div className="flex flex-col">
      <label
        htmlFor={id}
        className={cn(
          "flex items-center gap-3 rounded-card border px-4 py-3 text-body transition-colors duration-150",
          !disabled && "cursor-pointer hover:bg-forest-100",
          disabled && "cursor-default",
          review === "correct" && "border-lime-500 bg-lime-200/60",
          review === "missed" && (isWrongPick ? "border-ember-500 text-ink" : "border-warm-200 text-warm-400"),
          !isReviewed && (checked ? "border-ink bg-forest-100" : "border-warm-200"),
          hasFeedback && "rounded-b-none border-b-0",
        )}
      >
        <Control
          id={id}
          name={name}
          checked={checked}
          disabled={disabled}
          aria-describedby={hasFeedback ? feedbackId : undefined}
          onChange={onChange}
        />
        <span className="flex-1">{text}</span>
        {review === "correct" && (
          <span
            role="img"
            aria-label="Correct answer"
            className="inline-flex size-6 items-center justify-center rounded-full bg-lime-500 text-xs font-medium text-ink"
          >
            <span aria-hidden="true">✓</span>
          </span>
        )}
        {isWrongPick && (
          <span
            role="img"
            aria-label="Wrong answer"
            className="inline-flex size-6 items-center justify-center rounded-full bg-ember-500 text-xs font-medium text-ink"
          >
            <span aria-hidden="true">✗</span>
          </span>
        )}
      </label>

      {hasFeedback && (
        <p
          id={feedbackId}
          className={cn(
            "rounded-card rounded-t-none border border-t-0 px-4 pt-1 pb-3 text-sm",
            review === "correct" && "border-lime-500 bg-lime-200/60 text-forest-deep",
            isWrongPick && "border-ember-500 bg-warm-100 text-ember-700",
            review === "missed" && !isWrongPick && "border-warm-200 bg-warm-100/60 text-warm-400",
          )}
        >
          <span className="font-medium tracking-wider uppercase">
            {review === "correct" ? "Why this is right" : "Why this is wrong"}
          </span>
          <span className="mt-1 block text-ink/80">{feedback}</span>
        </p>
      )}
    </div>
  );
}
