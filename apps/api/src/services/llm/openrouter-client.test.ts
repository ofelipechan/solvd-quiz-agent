import { describe, it, expect, vi, beforeEach } from "vitest";
import type { OpenRouter } from "@openrouter/sdk";
import { OpenRouterClient } from "./openrouter-client.js";
import { OPENROUTER_MODEL_ID } from "../../config/env.js";
import { setupInMemoryTracing, findSpan, readAttribute } from "../../observability/testing/in-memory-tracing.js";

const tracing = setupInMemoryTracing();

function mockSdk(content: string, response: Record<string, unknown> = {}) {
  const send = vi.fn().mockResolvedValue({ choices: [{ message: { content } }], ...response });
  return { sdk: { chat: { send } } as unknown as OpenRouter, send };
}

describe("OpenRouterClient", () => {
  describe("chatJSON()", () => {
    describe("request and reply", () => {
      /**
       * Every chat targets the configured model and asks for a JSON object reply.
       * @scenario "a chat is sent to the configured model asking for a JSON reply"
       */
      it("asks the configured model for a JSON reply", async () => {
        const { sdk, send } = mockSdk('{"ok":true}');
        const client = new OpenRouterClient("test-api-key", OPENROUTER_MODEL_ID, sdk);

        await client.chatJSON([{ role: "user", content: "generate a quiz" }]);

        expect(send).toHaveBeenCalledWith({
          chatRequest: {
            model: OPENROUTER_MODEL_ID,
            messages: [{ role: "user", content: "generate a quiz" }],
            responseFormat: { type: "json_object" },
            stream: false,
          },
        });
      });

      /**
       * The caller gets the reply already parsed, never raw text.
       * @scenario "the parsed JSON reply is returned to the caller"
       */
      it("hands back the parsed reply", async () => {
        const { sdk } = mockSdk('{"questions":[]}');
        const client = new OpenRouterClient("test-api-key", OPENROUTER_MODEL_ID, sdk);

        const result = await client.chatJSON([{ role: "user", content: "prompt" }]);

        expect(result).toEqual({ questions: [] });
      });

      /**
       * Message order and content are preserved so system instructions reach the model first.
       * @scenario "a system message is sent ahead of the user message unchanged"
       */
      it("keeps system before user message", async () => {
        const { sdk, send } = mockSdk("{}");
        const client = new OpenRouterClient("test-api-key", OPENROUTER_MODEL_ID, sdk);

        await client.chatJSON([
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "generate a quiz" },
        ]);

        expect(send).toHaveBeenCalledWith({
          chatRequest: {
            model: OPENROUTER_MODEL_ID,
            messages: [
              { role: "system", content: "You are a helpful assistant." },
              { role: "user", content: "generate a quiz" },
            ],
            responseFormat: { type: "json_object" },
            stream: false,
          },
        });
      });

      /**
       * The model can be swapped per client instance without touching config.
       * @scenario "a custom model id overrides the configured one"
       */
      it("asks the custom model", async () => {
        const { sdk, send } = mockSdk("{}");
        const client = new OpenRouterClient("test-api-key", "custom/model:free", sdk);

        await client.chatJSON([{ role: "user", content: "prompt" }]);

        expect(send).toHaveBeenCalledWith(
          expect.objectContaining({
            chatRequest: expect.objectContaining({ model: "custom/model:free" }),
          }),
        );
      });
    });

    describe("tracing", () => {
      beforeEach(() => tracing.reset());

      const messages = [
        { role: "system" as const, content: "You are a quiz generator." },
        { role: "user" as const, content: "Document: # doc" },
      ];
      const usage = { promptTokens: 120, completionTokens: 30, totalTokens: 150 };

      /**
       * Every LLM call is a generation observation so model, tokens and cost can be attributed.
       * @scenario "the call is traced as a generation"
       */
      it("traces the call as a generation", async () => {
        const { sdk } = mockSdk("{}", { usage });
        await new OpenRouterClient("k", OPENROUTER_MODEL_ID, sdk).chatJSON(messages);

        const span = findSpan(await tracing.spans(), "generate-completion");
        expect(readAttribute(span, "langfuse.observation.type")).toBe("generation");
      });

      /**
       * The model id is captured so cost lookup and per-model comparison work.
       * @scenario "the trace records which model answered"
       */
      it("traces which model answered", async () => {
        const { sdk } = mockSdk("{}", { usage });
        await new OpenRouterClient("k", "custom/model:free", sdk).chatJSON(messages);

        const span = findSpan(await tracing.spans(), "generate-completion");
        expect(readAttribute(span, "langfuse.observation.model.name")).toBe("custom/model:free");
      });

      /**
       * The prompt is stored as role-labelled messages so it renders as a conversation.
       * @scenario "the trace records the messages sent as the generation input"
       */
      it("traces the messages as input", async () => {
        const { sdk } = mockSdk("{}", { usage });
        await new OpenRouterClient("k", OPENROUTER_MODEL_ID, sdk).chatJSON(messages);

        const span = findSpan(await tracing.spans(), "generate-completion");
        expect(readAttribute(span, "langfuse.observation.input")).toEqual(messages);
      });

      /**
       * The parsed reply is the output reviewers and evaluators read.
       * @scenario "the trace records the parsed reply as the generation output"
       */
      it("traces the parsed reply as output", async () => {
        const { sdk } = mockSdk('{"questions":[]}', { usage });
        await new OpenRouterClient("k", OPENROUTER_MODEL_ID, sdk).chatJSON(messages);

        const span = findSpan(await tracing.spans(), "generate-completion");
        expect(readAttribute(span, "langfuse.observation.output")).toEqual({ questions: [] });
      });

      /**
       * Provider token counts feed usage and cost dashboards.
       * @scenario "the trace records prompt, completion and total tokens"
       */
      it("traces token usage", async () => {
        const { sdk } = mockSdk("{}", { usage });
        await new OpenRouterClient("k", OPENROUTER_MODEL_ID, sdk).chatJSON(messages);

        const span = findSpan(await tracing.spans(), "generate-completion");
        expect(readAttribute(span, "langfuse.observation.usage_details")).toEqual({ input: 120, output: 30, total: 150 });
      });

      /**
       * A provider-reported cost overrides the tracing estimate (more accurate for niche models).
       * @scenario "the trace records the billed cost when the provider reports one"
       */
      it("traces the billed cost", async () => {
        const { sdk } = mockSdk("{}", { usage: { ...usage, cost: 0.00042 } });
        await new OpenRouterClient("k", OPENROUTER_MODEL_ID, sdk).chatJSON(messages);

        const span = findSpan(await tracing.spans(), "generate-completion");
        expect(readAttribute(span, "langfuse.observation.cost_details")).toEqual({ total: 0.00042 });
      });

      /**
       * No cost is invented when the provider does not report one.
       * @scenario "the trace carries no cost when the provider reports none"
       */
      it("traces no cost", async () => {
        const { sdk } = mockSdk("{}", { usage });
        await new OpenRouterClient("k", OPENROUTER_MODEL_ID, sdk).chatJSON(messages);

        const span = findSpan(await tracing.spans(), "generate-completion");
        expect(readAttribute(span, "langfuse.observation.cost_details")).toBeUndefined();
      });

      /**
       * The JSON-mode request is visible when debugging malformed replies.
       * @scenario "the trace records that a JSON reply was requested"
       */
      it("traces that a JSON reply was requested", async () => {
        const { sdk } = mockSdk("{}", { usage });
        await new OpenRouterClient("k", OPENROUTER_MODEL_ID, sdk).chatJSON(messages);

        const span = findSpan(await tracing.spans(), "generate-completion");
        expect(readAttribute(span, "langfuse.observation.model.parameters")).toEqual({ response_format: "json_object" });
      });

      /**
       * A reply that is not valid JSON fails the call and surfaces as an errored generation.
       * @scenario "a reply that is not JSON fails the call and marks the generation as errored"
       */
      it("fails and traces an error for an unparsable reply", async () => {
        const { sdk } = mockSdk("not json", { usage });
        await expect(new OpenRouterClient("k", OPENROUTER_MODEL_ID, sdk).chatJSON(messages)).rejects.toBeInstanceOf(SyntaxError);

        const span = findSpan(await tracing.spans(), "generate-completion");
        expect(span.status.code).toBe(2);
      });

      /**
       * The bad completion stays inspectable in the trace.
       * @scenario "the raw reply is kept as output when it cannot be parsed"
       */
      it("traces the raw reply when it cannot be parsed", async () => {
        const { sdk } = mockSdk("not json", { usage });
        await new OpenRouterClient("k", OPENROUTER_MODEL_ID, sdk).chatJSON(messages).catch(() => undefined);

        const span = findSpan(await tracing.spans(), "generate-completion");
        expect(readAttribute(span, "langfuse.observation.output")).toBe("not json");
      });
    });
  });
});
