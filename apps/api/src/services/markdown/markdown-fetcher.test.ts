import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchMarkdown, SourceFetchError } from "./markdown-fetcher.js";

describe("fetchMarkdown", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  /** GEN-04: non-2xx response fails fast with a named 'unreachable' error. */
  it("throws unreachable on non-2xx response", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ "content-type": "text/markdown" }),
      text: async () => "not found",
    });

    await expect(fetchMarkdown("https://example.com/README.md")).rejects.toMatchObject({
      kind: "unreachable",
    });
  });

  /** GEN-04: a non-text content type fails with a named 'not_text' error. */
  it("throws not_text on image content-type", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "image/png" }),
      text: async () => "",
    });

    await expect(fetchMarkdown("https://example.com/logo.png")).rejects.toMatchObject({
      kind: "not_text",
    });
  });

  /** GEN-03: content over the 200KB cap fails fast with 'too_large'. */
  it("throws too_large when body exceeds 200KB", async () => {
    const oversized = "a".repeat(200 * 1024 + 1);
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/markdown" }),
      text: async () => oversized,
    });

    await expect(fetchMarkdown("https://example.com/README.md")).rejects.toMatchObject({
      kind: "too_large",
    });
  });

  /** GEN-05: a github.com blob URL is rewritten to raw.githubusercontent.com before fetching. */
  it("rewrites a github.com blob URL to raw.githubusercontent.com before fetching", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/markdown" }),
      text: async () => "# hello",
    });

    await fetchMarkdown("https://github.com/x/y/blob/main/README.md");

    expect(fetch).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/x/y/main/README.md",
      expect.anything(),
    );
  });

  /** Edge case: OpenRouter/source call exceeding 30s aborts via AbortController. */
  it("aborts the request after 30s via AbortController", async () => {
    vi.useFakeTimers();
    (fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        }),
    );

    const pending = fetchMarkdown("https://example.com/README.md");
    const assertion = expect(pending).rejects.toMatchObject({ kind: "unreachable" });
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
  });

  it("returns content and the original sourceUrl on success", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/markdown" }),
      text: async () => "# hello",
    });

    const result = await fetchMarkdown("https://example.com/README.md");
    expect(result).toEqual({
      content: "# hello",
      sourceUrl: "https://example.com/README.md",
    });
  });
});

describe("SourceFetchError", () => {
  it("carries the failure kind", () => {
    const err = new SourceFetchError("not_text", "bad content type");
    expect(err.kind).toBe("not_text");
    expect(err.message).toBe("bad content type");
  });
});
