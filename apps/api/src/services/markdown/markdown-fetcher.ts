import { AppError } from "../../app.js";

const MAX_SOURCE_BYTES = 200 * 1024;
const FETCH_TIMEOUT_MS = 30_000;

export type SourceFetchErrorKind = "too_large" | "unreachable" | "not_text";

/** Thrown by `fetchMarkdown` on any fetch/validation failure (design's Error Handling Strategy). */
export class SourceFetchError extends AppError {
  readonly kind: SourceFetchErrorKind;

  constructor(kind: SourceFetchErrorKind, message: string) {
    super(message, 422);
    this.kind = kind;
  }
}

/**
 * Rewrites a `github.com/{owner}/{repo}/blob/{ref}/{path}` URL to its
 * `raw.githubusercontent.com/{owner}/{repo}/{ref}/{path}` equivalent
 * (GEN-05). Any other URL passes through unchanged.
 */
function toFetchUrl(sourceUrl: string): string {
  const match = sourceUrl.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/,
  );
  if (!match) {
    return sourceUrl;
  }
  const [, owner, repo, rest] = match;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${rest}`;
}

function isTextContentType(contentType: string | null): boolean {
  if (!contentType) {
    return false;
  }
  const mime = contentType.split(";")[0].trim().toLowerCase();
  return mime.startsWith("text/") || mime === "application/json";
}

/**
 * Fetches a public Markdown URL, validating size/content-type and rewriting
 * GitHub blob URLs before fetching. Returns the original `sourceUrl` (what
 * the caller submitted) alongside the fetched `content`.
 */
export async function fetchMarkdown(
  sourceUrl: string,
): Promise<{ content: string; sourceUrl: string }> {
  const fetchUrl = toFetchUrl(sourceUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(fetchUrl, { signal: controller.signal });
  } catch (err) {
    throw new SourceFetchError("unreachable", `failed to fetch source: ${(err as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new SourceFetchError("unreachable", `source responded with status ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  if (!isTextContentType(contentType)) {
    throw new SourceFetchError("not_text", `source content-type is not text: ${contentType}`);
  }

  const content = await response.text();
  if (Buffer.byteLength(content, "utf8") > MAX_SOURCE_BYTES) {
    throw new SourceFetchError("too_large", "source content exceeds 200KB limit");
  }

  return { content, sourceUrl };
}
