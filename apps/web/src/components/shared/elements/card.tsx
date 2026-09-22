import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/helpers/cn";

type CardTone = "white" | "mist" | "lime" | "dark";

const tones: Record<CardTone, string> = {
  white: "bg-white text-ink border border-warm-200",
  mist: "bg-forest-100 text-ink",
  lime: "bg-lime-200 text-ink",
  dark: "bg-forest-900 text-white is-dark",
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
  /** Adds the four corner squares from the style guide (§7.6). */
  dots?: boolean;
  children: ReactNode;
}

/** Rounded 10px surface (style guide §7.3). */
export function Card({ tone = "white", dots = false, className, children, ...rest }: CardProps) {
  return (
    <div {...rest} className={cn("rounded-card p-fluid-xs", tones[tone], dots && "corner-dots", className)}>
      {children}
    </div>
  );
}
