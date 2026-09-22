import type { ReactNode } from "react";
import { cn } from "@/lib/helpers/cn";

interface StatItemProps {
  value: ReactNode;
  label: string;
  className?: string;
}

/** Big serif number with a muted caption and an orange gradient rule on the left (style guide §7.4). */
export function StatItem({ value, label, className }: StatItemProps) {
  return (
    <div
      className={cn(
        "relative min-w-0 pl-3 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-px before:content-['']",
        "before:bg-[linear-gradient(180deg,var(--color-ember-700)_0%,var(--color-ember-500)_53.85%)]",
        className,
      )}
    >
      <p className="font-serif text-h3">{value}</p>
      <p className="mt-2 text-ui opacity-80">{label}</p>
    </div>
  );
}
