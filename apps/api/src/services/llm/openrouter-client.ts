import { OpenRouter } from "@openrouter/sdk";
import { OPENROUTER_MODEL_ID } from "../../config/env.js";

/**
 * The slice of the `@openrouter/sdk` client surface this wrapper depends
 * on. Kept as a narrow interface (dependency inversion) so tests inject a
 * mock instead of the real SDK, and so the real SDK's exact class shape is
 * isolated to `createOpenRouterClient` below.
 */
export interface ChatCompletionClient {
  chat: {
    send(request: {
      model: string;
      messages: Array<{ role: "user"; content: string }>;
      response_format?: { type: "json_object" };
    }): Promise<{ choices: Array<{ message: { content: string } }> }>;
  };
}

/** Thin wrapper requesting JSON-mode chat completions from OpenRouter. */
export class OpenRouterClient {
  constructor(
    private readonly sdk: ChatCompletionClient,
    private readonly model: string = OPENROUTER_MODEL_ID,
  ) {}

  /** Sends `prompt` in JSON mode and returns the parsed JSON response body. */
  async chatJSON(prompt: string): Promise<unknown> {
    const result = await this.sdk.chat.send({
      model: this.model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = result.choices[0]?.message?.content ?? "";
    return JSON.parse(content);
  }
}

/** Builds an `OpenRouterClient` backed by the real `@openrouter/sdk` client. */
export function createOpenRouterClient(apiKey: string): OpenRouterClient {
  const realSdk = new OpenRouter({ apiKey });

  // SPEC_DEVIATION: `@openrouter/sdk`'s `chat.send` expects the request body
  // nested under a `chatRequest` key, not the flat shape `ChatCompletionClient`
  // exposes. This adapter translates between the two so the rest of the
  // wrapper (and its unit tests, which mock the flat `ChatCompletionClient`
  // shape) stay decoupled from the real SDK's exact call signature.
  // Reason: discovered only when running the live smoke script (T13) against
  // the real SDK, which throws a Zod validation error on the flat shape.
  const sdk: ChatCompletionClient = {
    chat: {
      async send(request) {
        const response = await realSdk.chat.send({ chatRequest: request });
        return response as unknown as { choices: Array<{ message: { content: string } }> };
      },
    },
  };

  return new OpenRouterClient(sdk);
}
