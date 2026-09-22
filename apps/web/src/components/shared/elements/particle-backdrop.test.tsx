import { describe, it, expect, vi, afterEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ParticleBackdrop, LOOP_START_SECONDS } from "./particle-backdrop";

function mockReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue({ matches }),
  });
}

describe("<ParticleBackdrop/>", () => {
  afterEach(() => {
    // @ts-expect-error jsdom has no matchMedia; remove the test double
    delete window.matchMedia;
  });

  /**
   * Two copies of the animation frame the section, both silent and inline.
   * @scenario "the backdrop shows two muted inline videos"
   */
  it("shows two muted inline videos", () => {
    const { container } = render(<ParticleBackdrop />);
    const videos = container.querySelectorAll("video");
    expect(videos).toHaveLength(2);
    videos.forEach((video) => {
      expect(video).toHaveAttribute("playsinline");
      expect(video.muted).toBe(true);
    });
  });

  /**
   * The mirrored copy is lazy so the first one gets bandwidth priority.
   * @scenario "the second video loads only once the first can play through"
   */
  it("gives the second video its source once the first can play through", () => {
    const { container } = render(<ParticleBackdrop />);
    const [first, second] = Array.from(container.querySelectorAll("video"));
    expect(second.getAttribute("src")).toBeNull();
    fireEvent(first, new Event("canplaythrough"));
    expect(second.getAttribute("src")).toBe("/hero-animation.mp4");
  });

  /**
   * After the grow-in plays once, playback loops from the settled segment.
   * @scenario "a finished video restarts from the loop point"
   */
  it("restarts from the loop point when a video ends", () => {
    const { container } = render(<ParticleBackdrop />);
    const [first] = Array.from(container.querySelectorAll("video"));
    fireEvent(first, new Event("ended"));
    expect(first.currentTime).toBe(LOOP_START_SECONDS);
  });

  describe("given the user prefers reduced motion", () => {
    /**
     * Motion preference is respected by rendering no video at all.
     * @scenario "the backdrop shows nothing when the user prefers reduced motion"
     */
    it("shows no video", () => {
      mockReducedMotion(true);
      const { container } = render(<ParticleBackdrop />);
      expect(container.querySelectorAll("video")).toHaveLength(0);
    });
  });
});
