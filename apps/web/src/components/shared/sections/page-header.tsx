import type { ReactNode } from "react";
import { cn } from "@/lib/helpers/cn";
import { Eyebrow } from "@/components/shared/elements/eyebrow";

interface PageHeaderProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Section opener: eyebrow → serif H1 → optional lead copy, with an optional action slot on the right. */
export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-2xl">
        <Eyebrow className="mb-3">{eyebrow}</Eyebrow>
        <h1 className="text-h2 text-balance">{title}</h1>
        {description && <p className="mt-4 max-w-xl text-lead opacity-80">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
