import { describe, it, expect, vi } from "vitest";
import { OpenRouterClient, type ChatCompletionClient } from "./openrouter-client.js";
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
});
