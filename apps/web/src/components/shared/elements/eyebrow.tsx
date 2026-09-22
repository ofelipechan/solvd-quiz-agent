import type { ReactNode } from "react";
import { cn } from "@/lib/helpers/cn";

/** Small label above a heading, prefixed by a 6px lime square (style guide §7.2). */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 font-sans text-ui font-medium tracking-body opacity-80",
        "before:block before:size-1.5 before:shrink-0 before:bg-lime-500 before:content-['']",
        className,
      )}
    >
      {children}
    </p>
  );
}
