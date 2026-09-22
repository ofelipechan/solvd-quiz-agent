import { cn } from "@/lib/helpers/cn";
import { PixelCheckIcon } from "@/components/shared/elements/icons";

interface CheckListProps {
  items: string[];
  className?: string;
}

/** Hairline-separated list with pixel checkmarks (style guide §7.5). */
export function CheckList({ items, className }: CheckListProps) {
  return (
    <ul className={cn("divide-y divide-current/15 border-y border-current/15", className)}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 py-3 text-ui">
          <PixelCheckIcon className="mt-0.5 size-[1.2em] shrink-0 text-lime-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
