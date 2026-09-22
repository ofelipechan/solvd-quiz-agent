import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/helpers/cn";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className" | "placeholder"> {
  id: string;
  label: string;
  error?: string | null;
  hint?: string;
  className?: string;
}

/**
 * Underline text field with a floating label (style guide §7.10). Colors are
 * inherited from `currentColor`, so the same control works on light and dark surfaces.
 */
export function Input({ id, label, error, hint, className, ...rest }: InputProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="relative">
        <input
          {...rest}
          id={id}
          placeholder=" "
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "peer h-14 w-full border-0 border-b bg-transparent pt-6 pb-1 font-sans text-body font-medium text-current",
            "placeholder-transparent transition-[border-color,box-shadow] duration-150",
            "focus:border-current focus:shadow-[0_1px_0_0_currentColor] focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-danger shadow-[0_1px_0_0_var(--color-danger)]" : "border-current/25",
          )}
        />
        <label
          htmlFor={id}
          className={cn(
            "pointer-events-none absolute left-0 origin-top-left font-sans text-body transition-all duration-150",
            "top-1/2 -translate-y-1/2 opacity-70",
            "peer-focus:top-1 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:opacity-60",
            "peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:translate-y-0",
            "peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:opacity-60",
          )}
        >
          {label}
        </label>
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-sm opacity-60">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
