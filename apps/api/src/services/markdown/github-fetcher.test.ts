import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchGithubMarkdown } from "./github-fetcher.js";

describe("fetchGithubMarkdown()", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * A GitHub file page is downloaded from its raw-content endpoint, keeping the submitted URL in the result.
   * @scenario "a GitHub file page is downloaded through the GitHub fetcher"
   */
  it("downloads the raw file and keeps the submitted address", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/markdown" }),
      text: async () => "# GitHub",
    });

    const sourceUrl = "https://github.com/acme/docs/blob/main/README.md";
    const result = await fetchGithubMarkdown(sourceUrl);

    expect(fetch).toHaveBeenCalledWith(
      "https://raw.githubusercontent.com/acme/docs/main/README.md",
      expect.anything(),
    );
    expect(result).toEqual({ content: "# GitHub", sourceUrl });
  });
});
