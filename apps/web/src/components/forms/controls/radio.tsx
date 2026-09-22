import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/helpers/cn";

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  className?: string;
};

/**
 * Native radio restyled as a 20px ring with a lime dot. Stays a real
 * `<input type="radio">` so grouping by `name` and keyboard arrows keep working.
 */
export function Radio({ className, ...rest }: RadioProps) {
  return (
    <span className={cn("relative inline-flex size-5 shrink-0", className)}>
      <input
        {...rest}
        type="radio"
        className={cn(
          "peer size-5 cursor-pointer appearance-none rounded-full border border-current/40 bg-transparent",
          "transition-[border-color] duration-150",
          "hover:border-current checked:border-lime-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 m-auto size-2.5 scale-0 rounded-full bg-lime-500 transition-transform duration-150 peer-checked:scale-100"
      />
    </span>
  );
}
