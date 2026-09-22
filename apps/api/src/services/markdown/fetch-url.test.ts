import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchURL } from "./fetch-url.js";

describe("fetchURL()", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /**
   * Non-GitHub URLs are downloaded exactly as given.
   * @scenario "a document on any other domain is downloaded as-is"
   */
  it("downloads the address as given and hands back its content", async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "text/plain" }),
      text: async () => "# External",
    });

    const sourceUrl = "https://docs.example.com/raw/guide.md";
    const result = await fetchURL(sourceUrl);

    expect(fetch).toHaveBeenCalledWith(sourceUrl, expect.anything());
    expect(result).toEqual({ content: "# External", sourceUrl });
  });
});
