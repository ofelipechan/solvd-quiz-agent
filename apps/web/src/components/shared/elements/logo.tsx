import { cn } from "@/lib/helpers/cn";

interface LogoProps {
  className?: string;
  size?: "sm" | "lg";
}

/** Official Solvd wordmark, adapted to the app's dark surfaces. */
export function Logo({ className, size = "sm" }: LogoProps) {
  return (
    <img
      src="/solvd-logo.svg"
      alt="Solvd"
      width={400}
      height={93}
      className={cn("w-auto brightness-0 invert", size === "lg" ? "h-9" : "h-6", className)}
    />
  );
}
