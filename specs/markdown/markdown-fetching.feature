Feature: Fetch the source Markdown document
  As the quiz agent
  I want to download the Markdown behind a public URL with hard limits on size, type and time
  So that a bad URL fails fast with a named reason instead of feeding the LLM garbage

  # Failure kinds: unreachable (cannot be retrieved, timeout), not_text
  # (content is not text), too_large (over 200KB). A GitHub file page URL is
  # resolved to its raw file before downloading. 30s timeout.
  # Spec: GEN-03, GEN-04, GEN-05.

  # ============================================================
  # Group: Failure kinds
  # ============================================================

  @unit
  Scenario: a source that cannot be retrieved fails as unreachable
    Given the source cannot be retrieved
    When the source is fetched
    Then the fetch fails with kind unreachable

  @unit
  Scenario: a source that is not text fails as not_text
    Given the source is an image
    When the source is fetched
    Then the fetch fails with kind not_text

  @unit
  Scenario: a source over 200KB fails as too_large
    Given the source is 200KB plus one byte
    When the source is fetched
    Then the fetch fails with kind too_large

  @unit
  Scenario: a source that never answers fails as unreachable after 30 seconds
    Given the source never answers
    When the source is fetched and 30 seconds pass
    Then the fetch fails with kind unreachable

  # ============================================================
  # Group: Success and URL handling
  # ============================================================

  @unit
  Scenario: a fetched document carries its content and the original URL
    Given the source is the Markdown text "# hello"
    When the source is fetched
    Then the result carries content "# hello" and the URL that was submitted

  @unit
  Scenario: a GitHub file page URL is resolved to the raw file before downloading
    When a GitHub file page URL is fetched
    Then the raw file behind that page is downloaded

  @unit
  Scenario: a GitHub file page is downloaded through the GitHub fetcher
    When a GitHub file page URL is fetched through the GitHub fetcher
    Then the raw file behind that page is downloaded
    And the result carries the content and the URL that was submitted

  @unit
  Scenario: a document on any other domain is downloaded as-is
    When a Markdown URL on another domain is fetched
    Then that URL is downloaded unchanged
    And the result carries the content and that URL
