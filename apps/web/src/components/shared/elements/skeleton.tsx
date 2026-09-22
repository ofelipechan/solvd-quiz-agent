import { cn } from "@/lib/helpers/cn";

/** Shimmering placeholder block for loading states. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-card bg-current/10", className)} />;
}
