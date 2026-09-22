import { describe, it, expect } from "vitest";
import { maskSensitiveData } from "./mask.js";

describe("maskSensitiveData()", () => {
  /**
   * Never log PII: e-mail addresses are redacted before export.
   * @scenario "e-mail addresses are redacted"
   */
  it("redacts the e-mail address", () => {
    const masked = maskSensitiveData({ data: '{"content":"contact jane.doe+dev@example.co.uk now"}' });

    expect(masked).toBe('{"content":"contact [EMAIL_REDACTED] now"}');
  });

  /**
   * Secrets never reach the trace store: provider-style API keys are redacted.
   * @scenario "API-key-like tokens are redacted"
   */
  it("redacts provider-style keys", () => {
    const masked = maskSensitiveData({ data: "key sk-or-v1-0123456789abcdef and pk-lf-abcdef0123" });

    expect(masked).toBe("key [SECRET_REDACTED] and [SECRET_REDACTED]");
  });

  /**
   * Secrets never reach the trace store: bearer tokens pasted into content are redacted.
   * @scenario "bearer tokens are redacted"
   */
  it("redacts the bearer token", () => {
    const masked = maskSensitiveData({ data: "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig" });

    expect(masked).toBe("Authorization: Bearer [SECRET_REDACTED]");
  });

  /**
   * Ordinary quiz content is exported untouched so traces stay useful.
   * @scenario "text without sensitive data is exported unchanged"
   */
  it("leaves ordinary quiz content untouched", () => {
    const data = '{"questions":[{"text":"What does React use to describe UI?"}]}';

    expect(maskSensitiveData({ data })).toBe(data);
  });

  /**
   * Non-string attribute values pass through untouched.
   * @scenario "non-string values are exported unchanged"
   */
  it("leaves a number untouched", () => {
    expect(maskSensitiveData({ data: 42 })).toBe(42);
  });
});
