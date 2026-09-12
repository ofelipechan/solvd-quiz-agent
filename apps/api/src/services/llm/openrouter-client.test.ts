import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenRouterClient, LlmTimeoutError, type ChatCompletionClient } from "./openrouter-client.js";
import { OPENROUTER_MODEL_ID } from "../../config/env.js";

function mockSdk(content: string): ChatCompletionClient {
  return {
    chat: {
      send: vi.fn().mockResolvedValue({ choices: [{ message: { content } }] }),
    },
  };
}

describe("OpenRouterClient.chatJSON", () => {
  /** GEN-01: the wrapper requests the configured model in JSON mode with the given prompt. */
  it("sends the prompt to the SDK with the model, JSON-mode flag, and prompt content", async () => {
    const sdk = mockSdk('{"ok":true}');
    const client = new OpenRouterClient(sdk);

    await client.chatJSON("generate a quiz");

    expect(sdk.chat.send).toHaveBeenCalledWith({
      model: OPENROUTER_MODEL_ID,
      messages: [{ role: "user", content: "generate a quiz" }],
      response_format: { type: "json_object" },
    });
  });

  it("returns the parsed JSON content of the first choice", async () => {
    const sdk = mockSdk('{"questions":[]}');
    const client = new OpenRouterClient(sdk);

    const result = await client.chatJSON("prompt");

    expect(result).toEqual({ questions: [] });
  });

  it("uses a custom model id when provided", async () => {
    const sdk = mockSdk("{}");
    const client = new OpenRouterClient(sdk, "custom/model:free");

    await client.chatJSON("prompt");

    expect(sdk.chat.send).toHaveBeenCalledWith(
      expect.objectContaining({ model: "custom/model:free" }),
    );
  });

  /** Edge case (design's Error Handling Strategy): a >30s OpenRouter call SHALL abort as a 504, not hang. */
  describe("timeout", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("rejects with LlmTimeoutError (statusCode 504) when the SDK call exceeds 30s", async () => {
      const sdk: ChatCompletionClient = {
        chat: {
          // Never resolves - simulates a hung upstream call.
          send: vi.fn(() => new Promise<never>(() => {})),
        },
      };
      const client = new OpenRouterClient(sdk);

      const pending = client.chatJSON("prompt");
      const assertion = expect(pending).rejects.toBeInstanceOf(LlmTimeoutError);
      await vi.advanceTimersByTimeAsync(30_000);
      await assertion;

      let caught: unknown;
      try {
        await pending;
      } catch (e) {
        caught = e;
      }
      expect((caught as LlmTimeoutError).statusCode).toBe(504);
    });
  });
});
