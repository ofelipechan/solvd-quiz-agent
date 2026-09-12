import { describe, it, expect, vi } from "vitest";
import { DefaultGenerationStrategy, GenerationFailedError } from "./default-generation.strategy.js";
import type { OpenRouterClient } from "../llm/openrouter-client.js";

const validQuiz = {
  questions: Array.from({ length: 5 }, (_, i) => ({
    text: `question ${i}`,
    questionType: "single" as const,
    options: [
      { text: "a", isCorrect: true },
      { text: "b", isCorrect: false },
      { text: "c", isCorrect: false },
      { text: "d", isCorrect: false },
    ],
  })),
};

const invalidQuiz = { questions: [] };

function mockClient(...responses: unknown[]): OpenRouterClient {
  const chatJSON = vi.fn();
  responses.forEach((r) => chatJSON.mockResolvedValueOnce(r));
  return { chatJSON } as unknown as OpenRouterClient;
}

describe("DefaultGenerationStrategy.generate", () => {
  /** GEN-01/GEN-02: valid JSON on the first attempt returns the parsed quiz without retrying. */
  it("returns the parsed quiz on the first valid response with no retry", async () => {
    const client = mockClient(validQuiz);
    const strategy = new DefaultGenerationStrategy(client);

    const result = await strategy.generate("# doc");

    expect(result).toEqual(validQuiz);
    expect(client.chatJSON).toHaveBeenCalledTimes(1);
  });

  /** GEN-06: an invalid first response is retried exactly once, then succeeds. */
  it("retries exactly once after an invalid first response, then returns the valid result", async () => {
    const client = mockClient(invalidQuiz, validQuiz);
    const strategy = new DefaultGenerationStrategy(client);

    const result = await strategy.generate("# doc");

    expect(result).toEqual(validQuiz);
    expect(client.chatJSON).toHaveBeenCalledTimes(2);
  });

  /** GEN-06: two invalid responses in a row throw GenerationFailedError with no third call. */
  it("throws GenerationFailedError after two invalid responses with no third call", async () => {
    const client = mockClient(invalidQuiz, invalidQuiz);
    const strategy = new DefaultGenerationStrategy(client);

    await expect(strategy.generate("# doc")).rejects.toBeInstanceOf(GenerationFailedError);
    expect(client.chatJSON).toHaveBeenCalledTimes(2);
  });

  it("includes the markdown source in the prompt sent to the client", async () => {
    const client = mockClient(validQuiz);
    const strategy = new DefaultGenerationStrategy(client);

    await strategy.generate("# unique-marker-content");

    expect(client.chatJSON).toHaveBeenCalledWith(expect.stringContaining("# unique-marker-content"));
  });
});
