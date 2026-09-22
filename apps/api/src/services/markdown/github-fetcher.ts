import { fetchURL } from "./fetch-url.js";

const GITHUB_BLOB_URL =
  /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/;

export function isGithubBlobUrl(sourceUrl: string): boolean {
  return GITHUB_BLOB_URL.test(sourceUrl);
}

/** Downloads a GitHub blob through GitHub's raw-content endpoint. */
export async function fetchGithubMarkdown(
  sourceUrl: string,
): Promise<{ content: string; sourceUrl: string }> {
  const match = sourceUrl.match(GITHUB_BLOB_URL);
  const [, owner, repo, rest] = match ?? [];

  if (!owner || !repo || !rest) {
    return fetchURL(sourceUrl);
  }

  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${rest}`;
  const result = await fetchURL(rawUrl);

  return { content: result.content, sourceUrl };
}
