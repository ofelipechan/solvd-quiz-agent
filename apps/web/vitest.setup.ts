import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// jsdom does not implement media playback; stub it so <video> components stay quiet in tests.
vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);

afterEach(() => {
  cleanup();
});
