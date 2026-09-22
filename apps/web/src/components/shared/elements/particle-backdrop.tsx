import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/helpers/cn";

export const HERO_ANIMATION_SRC = "/hero-animation.mp4";
/** The grow-in plays once from 0s; afterwards playback loops from the settled segment (style guide §9.1). */
export const LOOP_START_SECONDS = 4.7;

interface ParticleBackdropProps {
  /** Layer opacity — keep ≤ .3 so text on top stays legible. */
  opacity?: number;
  className?: string;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

function safePlay(video: HTMLVideoElement): void {
  try {
    const result = video.play() as Promise<void> | undefined;
    if (result && typeof result.catch === "function") {
      result.catch(() => {
        /* autoplay blocked by the browser; the still frame is fine */
      });
    }
  } catch {
    /* jsdom / very old browsers */
  }
}

function restartFromLoopPoint(this: HTMLVideoElement): void {
  this.currentTime = LOOP_START_SECONDS;
  safePlay(this);
}

/**
 * Solvd's signature hero element: the particle-tree animation, once on each
 * side of the section with the right copy mirrored. Black in the video is
 * blended away with `mix-blend-mode: lighten`, so only the white dots remain.
 */
export function ParticleBackdrop({ opacity = 0.3, className }: ParticleBackdropProps) {
  const [reducedMotion] = useState(prefersReducedMotion);
  const leftRef = useRef<HTMLVideoElement>(null);
  const rightRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    // The mirrored copy is lazy: it only downloads once the first copy is ready.
    const startRight = () => {
      if (right.getAttribute("src")) return;
      // Play only once data is ready: calling play() synchronously after
      // setting `src` gets aborted by the load it just triggered.
      right.defaultMuted = true; // reflects the `muted` attribute React does not render
      right.preload = "auto"; // `preload="none"` would never fetch, so `canplay` would never fire
      right.addEventListener("canplay", () => safePlay(right), { once: true });
      right.setAttribute("src", HERO_ANIMATION_SRC);
    };

    if (left.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      startRight();
    } else {
      left.addEventListener("canplaythrough", startRight, { once: true });
    }
    left.addEventListener("ended", restartFromLoopPoint);
    right.addEventListener("ended", restartFromLoopPoint);

    return () => {
      left.removeEventListener("canplaythrough", startRight);
      left.removeEventListener("ended", restartFromLoopPoint);
      right.removeEventListener("ended", restartFromLoopPoint);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  // Blend mode and z-index live on the SAME element: a wrapper with its own
  // z-index would open a new stacking context, and the video would then blend
  // against a transparent group instead of the section background.
  // The parent section must be `relative isolate overflow-hidden`.
  const layer = cn(
    "pointer-events-none absolute inset-0 -z-10 flex h-full w-full items-center mix-blend-lighten",
    className,
  );
  const video = "relative h-full w-1/2 object-contain object-left";

  return (
    <>
      <div aria-hidden="true" className={cn(layer, "justify-start")} style={{ opacity }}>
        <video ref={leftRef} src={HERO_ANIMATION_SRC} autoPlay muted playsInline preload="auto" className={video} />
      </div>
      <div aria-hidden="true" className={cn(layer, "justify-end")} style={{ opacity }}>
        <video
          ref={rightRef}
          data-src={HERO_ANIMATION_SRC}
          muted
          playsInline
          preload="none"
          className={cn(video, "-scale-x-100")}
        />
      </div>
    </>
  );
}
