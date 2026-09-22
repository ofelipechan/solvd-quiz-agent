import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/helpers/cn";
import { PixelArrowIcon, PixelSpinnerIcon } from "@/components/shared/elements/icons";

export type ButtonVariant = "primary" | "white" | "gray" | "outline" | "ghost" | "link" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Disables the control and shows a spinner; keep the label describing the in-flight action. */
  loading?: boolean;
  /** Trailing pixel arrow. Hidden automatically while loading. */
  arrow?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children"> & { href?: undefined };

type ButtonAsAnchor = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children"> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-pill border font-sans font-medium leading-none tracking-body whitespace-nowrap " +
  "transition-[color,background-color,border-color,opacity] duration-300 select-none " +
  "cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 " +
  "[&>svg]:transition-transform [&>svg]:duration-300 hover:[&>svg]:translate-x-0.5";

const variants: Record<ButtonVariant, { root: string; icon: string }> = {
  primary: { root: "border-transparent bg-ink text-white hover:bg-warm-400", icon: "text-lime-200" },
  white: { root: "border-transparent bg-white text-ink hover:bg-warm-100", icon: "text-lime-500" },
  gray: { root: "border-transparent bg-warm-100 text-ink hover:bg-warm-200", icon: "text-lime-500" },
  outline: {
    root: "border-current/40 bg-transparent text-current hover:border-current",
    icon: "text-lime-500",
  },
  ghost: { root: "border-transparent bg-transparent text-current hover:bg-current/10", icon: "text-lime-500" },
  link: {
    root: "h-auto min-h-0 rounded-none border-0 bg-transparent p-0 text-current leading-tight hover:opacity-80",
    icon: "text-lime-500",
  },
  danger: { root: "border-transparent bg-ember-700 text-white hover:bg-ember-500", icon: "text-white" },
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-[34px] px-3.5 text-sm",
  md: "min-h-[42px] px-4 text-ui",
  lg: "min-h-[56px] px-6 text-body",
};

/** Solvd-style pill button. Renders an `<a>` when `href` is set, otherwise a `<button>` (default type="button"). */
export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    arrow = true,
    fullWidth = false,
    children,
    className,
    ...rest
  } = props;

  const styles = variants[variant];
  const classes = cn(
    base,
    variant !== "link" && sizes[size],
    styles.root,
    fullWidth && "w-full",
    className,
  );

  const content = (
    <>
      {children}
      {loading && <PixelSpinnerIcon className={cn("size-[1.125em]", styles.icon)} />}
      {!loading && arrow && <PixelArrowIcon className={cn("size-[1.125em]", styles.icon)} />}
    </>
  );

  if ("href" in rest && typeof rest.href === "string") {
    const anchorProps = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a {...anchorProps} className={classes} aria-busy={loading || undefined}>
        {content}
      </a>
    );
  }

  const { type = "button", disabled, ...buttonProps } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      {...buttonProps}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {content}
    </button>
  );
}
