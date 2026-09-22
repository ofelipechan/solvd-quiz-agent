import { fetchGithubMarkdown, isGithubBlobUrl } from "./github-fetcher.js";
import { fetchURL } from "./fetch-url.js";

/**
 * Fetches a public Markdown URL, validating size/content-type and rewriting
 * GitHub blob URLs before fetching. Returns the original `sourceUrl` (what
 * the caller submitted) alongside the fetched `content`.
 */
export async function fetchMarkdown(
  sourceUrl: string,
): Promise<{ content: string; sourceUrl: string }> {
  return isGithubBlobUrl(sourceUrl)
    ? fetchGithubMarkdown(sourceUrl)
    : fetchURL(sourceUrl);
}
