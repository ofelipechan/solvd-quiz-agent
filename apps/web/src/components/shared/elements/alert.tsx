import type { ReactNode } from "react";
import { cn } from "@/lib/helpers/cn";
import { PixelCheckIcon, PixelCloseIcon } from "@/components/shared/elements/icons";

type AlertTone = "error" | "success" | "info";

const tones: Record<AlertTone, { root: string; icon: ReactNode }> = {
  error: {
    root: "border-danger/40 bg-danger/10 text-current",
    icon: <PixelCloseIcon className="size-5 shrink-0 text-danger" />,
  },
  success: {
    root: "border-lime-500/40 bg-lime-200/40 text-current",
    icon: <PixelCheckIcon className="size-5 shrink-0 text-lime-500" />,
  },
  info: { root: "border-current/20 bg-current/5 text-current", icon: null },
};

interface AlertProps {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
}

/** Inline status message. `error` tone is announced immediately via role="alert". */
export function Alert({ tone = "info", children, className }: AlertProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-card border px-4 py-3 text-ui", tones[tone].root, className)}
    >
      {tones[tone].icon}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
