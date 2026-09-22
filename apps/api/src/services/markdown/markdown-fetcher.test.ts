import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SourceFetchError } from "../../errors/source-fetch.error.js";
import { fetchMarkdown } from "./markdown-fetcher.js";

function mockFetchResponse(overrides: Partial<{ ok: boolean; status: number; contentType: string; body: string }> = {}) {
  const { ok = true, status = 200, contentType = "text/markdown", body = "" } = overrides;
  (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok,
    status,
    headers: new Headers({ "content-type": contentType }),
    text: async () => body,
  });
}

describe("fetchMarkdown()", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe("given the source cannot be served", () => {
    /**
     * A source that cannot be retrieved fails fast with a named reason.
     * @scenario "a source that cannot be retrieved fails as unreachable"
     */
    it("fails as unreachable when the source is not served", async () => {
      mockFetchResponse({ ok: false, status: 404, body: "not found" });

      await expect(fetchMarkdown("https://example.com/README.md")).rejects.toMatchObject({
        kind: "unreachable",
      });
    });

    /**
     * Only text content is accepted as a quiz source.
     * @scenario "a source that is not text fails as not_text"
     */
    it("fails as not_text for an image", async () => {
      mockFetchResponse({ contentType: "image/png" });

      await expect(fetchMarkdown("https://example.com/logo.png")).rejects.toMatchObject({
        kind: "not_text",
      });
    });

    /**
     * Content over the 200KB cap is refused before reaching the LLM.
     * @scenario "a source over 200KB fails as too_large"
     */
    it("fails as too_large past 200KB", async () => {
      mockFetchResponse({ body: "a".repeat(200 * 1024 + 1) });

      await expect(fetchMarkdown("https://example.com/README.md")).rejects.toMatchObject({
        kind: "too_large",
      });
    });

    /**
     * A hanging source is abandoned after 30 seconds.
     * @scenario "a source that never answers fails as unreachable after 30 seconds"
     */
    it("fails as unreachable after 30 seconds", async () => {
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
  });

  describe("given the source is served", () => {
    /**
     * The caller gets the text plus the URL they submitted, not a rewritten one.
     * @scenario "a fetched document carries its content and the original URL"
     */
    it("hands back the content and the submitted address", async () => {
      mockFetchResponse({ body: "# hello" });

      const result = await fetchMarkdown("https://example.com/README.md");
      expect(result).toEqual({
        content: "# hello",
        sourceUrl: "https://example.com/README.md",
      });
    });

    /**
     * GitHub file pages are HTML; the raw file behind them is what gets downloaded.
     * @scenario "a GitHub file page URL is resolved to the raw file before downloading"
     */
    it("downloads the raw file behind a GitHub page", async () => {
      mockFetchResponse({ body: "# hello" });

      await fetchMarkdown("https://github.com/x/y/blob/main/README.md");

      expect(fetch).toHaveBeenCalledWith(
        "https://raw.githubusercontent.com/x/y/main/README.md",
        expect.anything(),
      );
    });
  });
});

describe("SourceFetchError", () => {
  /** A fetch failure names its kind so callers can map it to a user-facing reason. */
  it("carries the failure kind and message", () => {
    const err = new SourceFetchError("not_text", "bad content type");
    expect(err.kind).toBe("not_text");
    expect(err.message).toBe("bad content type");
  });
});
