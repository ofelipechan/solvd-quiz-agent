import { OpenRouter } from "@openrouter/sdk";
import type { ChatUsage } from "@openrouter/sdk/models";
import { startActiveObservation } from "@langfuse/tracing";
import { OPENROUTER_MODEL_ID } from "../../config/env.js";
import type { ChatMessage } from "../../models/chat.model.js";

const RESPONSE_FORMAT = { type: "json_object" } as const;

/** Maps OpenRouter token counts onto Langfuse's generic `input`/`output`/`total` usage keys. */
function toUsageDetails(usage: ChatUsage | undefined): Record<string, number> | undefined {
  if (!usage) {
    return undefined;
  }
  return { input: usage.promptTokens, output: usage.completionTokens, total: usage.totalTokens };
}

/** OpenRouter's billed cost (present with usage accounting) beats Langfuse's price-table estimate. */
function toCostDetails(usage: ChatUsage | undefined): Record<string, number> | undefined {
  return typeof usage?.cost === "number" ? { total: usage.cost } : undefined;
}

/** Thin wrapper requesting JSON-mode chat completions from OpenRouter. */
export class OpenRouterClient {
  constructor(
    apiKey: string,
    private readonly model: string = OPENROUTER_MODEL_ID,
    private readonly sdk: OpenRouter = new OpenRouter({ apiKey }),
  ) {}

  /**
   * Sends `messages` in JSON mode and returns the parsed JSON response body.
   * Request shape follows OpenRouter's TypeScript SDK documentation. The call
   * is traced as a Langfuse `generation` (model, messages, reply, tokens, cost).
   */
  async chatJSON(messages: ChatMessage[]): Promise<unknown> {
    return startActiveObservation(
      "generate-completion",
      async (generation) => {
        generation.update({
          model: this.model,
          input: messages,
          modelParameters: { response_format: RESPONSE_FORMAT.type },
        });

        const result = await this.sdk.chat.send({
          chatRequest: {
            model: this.model,
            messages,
            responseFormat: RESPONSE_FORMAT,
            stream: false,
          },
        });

        if (!("choices" in result)) {
          throw new TypeError("OpenRouter returned an unexpected streaming response");
        }
        generation.update({
          // OpenRouter may route to a different model than requested; record the one that answered.
          model: result.model || this.model,
          usageDetails: toUsageDetails(result.usage),
          costDetails: toCostDetails(result.usage),
        });

        const content = result.choices[0]?.message?.content;
        if (typeof content !== "string") {
          throw new SyntaxError("OpenRouter response does not contain text content");
        }
        // Raw text first so a malformed reply is still inspectable in the trace.
        generation.update({ output: content });
        const parsed: unknown = JSON.parse(content);
        generation.update({ output: parsed });
        return parsed;
      },
      { asType: "generation" },
    );
  }
}
