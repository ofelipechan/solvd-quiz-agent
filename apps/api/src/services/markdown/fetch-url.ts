import { SourceFetchError } from "../../errors/source-fetch.error.js";

const MAX_SOURCE_BYTES = 200 * 1024;
const FETCH_TIMEOUT_MS = 30_000;

function isTextContentType(contentType: string | null): boolean {
  if (!contentType) {
    return false;
  }
  const mime = contentType.split(";")[0].trim().toLowerCase();
  return mime.startsWith("text/") || mime === "application/json";
}

/** Downloads Markdown-compatible content from a URL without rewriting it. */
export async function fetchURL(
  sourceUrl: string,
): Promise<{ content: string; sourceUrl: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(sourceUrl, { signal: controller.signal });
  } catch (err) {
    const cause = (err as { cause?: unknown }).cause;
    const detail = cause instanceof Error ? cause.message : (err as Error).message;
    throw new SourceFetchError("unreachable", `failed to fetch source: ${detail}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new SourceFetchError(
      "unreachable",
      `source responded with status ${response.status}`,
    );
  }

  const contentType = response.headers.get("content-type");
  if (!isTextContentType(contentType)) {
    throw new SourceFetchError(
      "not_text",
      `source content-type is not text: ${contentType}`,
    );
  }

  const content = await response.text();
  if (Buffer.byteLength(content, "utf8") > MAX_SOURCE_BYTES) {
    throw new SourceFetchError("too_large", "source content exceeds 200KB limit");
  }

  return { content, sourceUrl };
}
