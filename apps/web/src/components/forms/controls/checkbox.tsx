import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/helpers/cn";
import { PixelCheckIcon } from "@/components/shared/elements/icons";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  className?: string;
};

/**
 * Native checkbox restyled as a 20px square with a pixel check. Stays a real
 * `<input type="checkbox">` so forms, keyboard, and assistive tech work unchanged.
 */
export function Checkbox({ className, ...rest }: CheckboxProps) {
  return (
    <span className={cn("relative inline-flex size-5 shrink-0", className)}>
      <input
        {...rest}
        type="checkbox"
        className={cn(
          "peer size-5 cursor-pointer appearance-none rounded-[4px] border border-current/40 bg-transparent",
          "transition-[background-color,border-color] duration-150",
          "hover:border-current checked:border-lime-500 checked:bg-lime-500",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      />
      <PixelCheckIcon className="pointer-events-none absolute inset-0 m-auto size-4 text-ink opacity-0 transition-opacity duration-150 peer-checked:opacity-100" />
    </span>
  );
}
