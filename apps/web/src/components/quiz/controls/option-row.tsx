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
  onChange: () => void;
}

/** One selectable answer: a full-width row with a custom radio/checkbox and hover feedback. */
export function OptionRow({ id, name, text, kind, checked, disabled, review = "none", onChange }: OptionRowProps) {
  const Control = kind === "single" ? Radio : Checkbox;
  const isReviewed = review !== "none";

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-center gap-3 rounded-card border px-4 py-3 text-body transition-colors duration-150",
        !disabled && "cursor-pointer hover:bg-forest-100",
        disabled && "cursor-default",
        review === "correct" && "border-lime-500 bg-lime-200/60",
        review === "missed" && "border-warm-200 text-warm-400",
        !isReviewed && (checked ? "border-ink bg-forest-100" : "border-warm-200"),
      )}
    >
      <Control id={id} name={name} checked={checked} disabled={disabled} onChange={onChange} />
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
    </label>
  );
}
