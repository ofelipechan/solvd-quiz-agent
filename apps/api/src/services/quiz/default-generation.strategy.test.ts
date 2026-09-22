import { describe, it, expect, vi, beforeEach } from "vitest";
import type { OpenRouter } from "@openrouter/sdk";
import { GenerationFailedError } from "../../errors/quiz.errors.js";
import { DefaultGenerationStrategy } from "./default-generation.strategy.js";
import { OpenRouterClient } from "../llm/openrouter-client.js";
import { setupInMemoryTracing, findSpan, isChildOf, readAttribute } from "../../observability/testing/in-memory-tracing.js";

const tracing = setupInMemoryTracing();

const responseFormat = { type: "json_object" as const };

const validQuiz = {
  questions: Array.from({ length: 5 }, (_, i) => ({
    text: `question ${i}`,
    questionType: "single" as const,
    options: [
      { text: "a", isCorrect: true, feedback: "a is what the document states" },
      { text: "b", isCorrect: false, feedback: "b contradicts the document" },
      { text: "c", isCorrect: false, feedback: "c is never mentioned" },
      { text: "d", isCorrect: false, feedback: "d is the opposite of the document" },
    ],
  })),
};

const invalidQuiz = { questions: [] };

function mockClient(...responses: unknown[]): OpenRouterClient {
  const chatJSON = vi.fn();
  responses.forEach((r) => chatJSON.mockResolvedValueOnce(r));
  return { chatJSON } as unknown as OpenRouterClient;
}

describe("DefaultGenerationStrategy", () => {
  describe("generate()", () => {
    describe("prompt shape", () => {
      /**
       * The review after a submission is only as good as the explanations the
       * generator is asked for, so the instructions must demand one per option.
       * @scenario "the generator is told to explain every option"
       */
      it("asks for a feedback on every option", async () => {
        const client = mockClient(validQuiz);
        const strategy = new DefaultGenerationStrategy(client);

        await strategy.generate("# a document", responseFormat);

        const [messages] = vi.mocked(client.chatJSON).mock.calls[0];
        expect(messages[0]).toMatchObject({
          role: "system",
          content: expect.stringContaining("feedback"),
        });
      });

      /**
       * The document goes to the LLM verbatim so nothing is lost before generation.
       * @scenario "the document text is sent to the LLM verbatim"
       */
      it("sends the document text verbatim", async () => {
        const client = mockClient(validQuiz);
        const strategy = new DefaultGenerationStrategy(client);

        await strategy.generate("# unique-marker-content", responseFormat);

        expect(client.chatJSON).toHaveBeenCalledWith(
          [
            expect.objectContaining({ role: "system" }),
            expect.objectContaining({
              role: "user",
              content: expect.stringContaining("# unique-marker-content"),
            }),
          ],
          responseFormat,
        );
      });

      /**
       * The strategy does not own the reply shape; it forwards whatever format the caller wants.
       * @scenario "the caller's response format is forwarded to the LLM"
       */
      it("forwards the caller's response format", async () => {
        const client = mockClient(validQuiz);
        const strategy = new DefaultGenerationStrategy(client);
        const format = { type: "json_schema" as const, jsonSchema: { name: "quiz", schema: {} } };

        await strategy.generate("# doc", format);

        expect(client.chatJSON).toHaveBeenCalledWith(expect.any(Array), format);
      });

      /**
       * Instructions and document stay separate so the model treats them differently.
       * @scenario "generator instructions are sent separately from the document"
       */
      it("keeps instructions apart from the document", async () => {
        const client = mockClient(validQuiz);
        const strategy = new DefaultGenerationStrategy(client);

        await strategy.generate("# doc", responseFormat);

        expect(client.chatJSON).toHaveBeenCalledWith(
          [
            expect.objectContaining({
              role: "system",
              content: expect.stringContaining("You are a quiz generator"),
            }),
            expect.objectContaining({
              role: "user",
              content: expect.not.stringContaining("You are a quiz generator"),
            }),
          ],
          responseFormat,
        );
      });
    });

    describe("given the first reply is valid", () => {
      /**
       * A valid reply is used as-is; no unnecessary LLM calls.
       * @scenario "a valid first reply is returned without a retry"
       */
      it("hands back the quiz after one ask", async () => {
        const client = mockClient(validQuiz);
        const strategy = new DefaultGenerationStrategy(client);

        const result = await strategy.generate("# doc", responseFormat);

        expect(result).toEqual(validQuiz);
        expect(client.chatJSON).toHaveBeenCalledTimes(1);
      });
    });

    describe("given the first reply breaks the contract", () => {
      /**
       * One retry recovers from a transient bad generation.
       * @scenario "an invalid first reply is retried exactly once"
       */
      it("hands back the second reply after two asks", async () => {
        const client = mockClient(invalidQuiz, validQuiz);
        const strategy = new DefaultGenerationStrategy(client);

        const result = await strategy.generate("# doc", responseFormat);

        expect(result).toEqual(validQuiz);
        expect(client.chatJSON).toHaveBeenCalledTimes(2);
      });

      /**
       * Two bad generations in a row fail the run rather than looping.
       * @scenario "two invalid replies fail the generation with no third attempt"
       */
      it("fails after two asks with no third attempt", async () => {
        const client = mockClient(invalidQuiz, invalidQuiz);
        const strategy = new DefaultGenerationStrategy(client);

        await expect(strategy.generate("# doc", responseFormat)).rejects.toBeInstanceOf(GenerationFailedError);
        expect(client.chatJSON).toHaveBeenCalledTimes(2);
      });
    });

    describe("tracing", () => {
      beforeEach(() => tracing.reset());

      /**
       * The strategy run is a chain observation linking the LLM call(s) to validation.
       * @scenario "the run is traced as a chain"
       */
      it("traces the run as a chain", async () => {
        await new DefaultGenerationStrategy(mockClient(validQuiz)).generate("# doc", responseFormat);

        const span = findSpan(await tracing.spans(), "generate-questions");
        expect(readAttribute(span, "langfuse.observation.type")).toBe("chain");
      });

      /**
       * The trace tree shows which step made the LLM call.
       * @scenario "the LLM call is nested under the generation run"
       */
      it("nests the LLM call under the run", async () => {
        const send = vi.fn().mockResolvedValue({ choices: [{ message: { content: JSON.stringify(validQuiz) } }] });
        const client = new OpenRouterClient("k", "m", { chat: { send } } as unknown as OpenRouter);
        await new DefaultGenerationStrategy(client).generate("# doc", responseFormat);

        const spans = await tracing.spans();
        expect(isChildOf(findSpan(spans, "generate-completion"), findSpan(spans, "generate-questions"))).toBe(true);
      });

      /**
       * The validated quiz is the output evaluators read.
       * @scenario "the validated quiz is the run's output"
       */
      it("traces the validated quiz as output", async () => {
        await new DefaultGenerationStrategy(mockClient(validQuiz)).generate("# doc", responseFormat);

        const span = findSpan(await tracing.spans(), "generate-questions");
        expect(readAttribute(span, "langfuse.observation.output")).toEqual(validQuiz);
      });

      /**
       * Attempt count lets retry rate be charted.
       * @scenario "a clean first reply is recorded as one attempt"
       */
      it("traces one attempt", async () => {
        await new DefaultGenerationStrategy(mockClient(validQuiz)).generate("# doc", responseFormat);

        const span = findSpan(await tracing.spans(), "generate-questions");
        expect(readAttribute(span, "langfuse.observation.metadata.attempts")).toBe(1);
      });

      /**
       * Attempt count lets retry rate be charted.
       * @scenario "a retry is recorded as two attempts"
       */
      it("traces two attempts", async () => {
        await new DefaultGenerationStrategy(mockClient(invalidQuiz, validQuiz)).generate("# doc", responseFormat);

        const span = findSpan(await tracing.spans(), "generate-questions");
        expect(readAttribute(span, "langfuse.observation.metadata.attempts")).toBe(2);
      });

      /**
       * A recovered failure is visible, not silently absorbed.
       * @scenario "a recovered contract failure is flagged as a warning"
       */
      it("flags the run as a warning", async () => {
        await new DefaultGenerationStrategy(mockClient(invalidQuiz, validQuiz)).generate("# doc", responseFormat);

        const span = findSpan(await tracing.spans(), "generate-questions");
        expect(readAttribute(span, "langfuse.observation.level")).toBe("WARNING");
      });

      /**
       * The violations of the failed attempt are kept for prompt debugging.
       * @scenario "the contract issues of the failed attempt are kept in the trace"
       */
      it("traces which field failed", async () => {
        await new DefaultGenerationStrategy(mockClient(invalidQuiz, validQuiz)).generate("# doc", responseFormat);

        const span = findSpan(await tracing.spans(), "generate-questions");
        expect(readAttribute(span, "langfuse.observation.metadata.validationIssues")).toEqual([
          expect.stringContaining("questions"),
        ]);
      });

      /**
       * Exhausting both attempts surfaces as an errored run.
       * @scenario "the run is marked as errored when both attempts fail"
       */
      it("traces the run as errored", async () => {
        await new DefaultGenerationStrategy(mockClient(invalidQuiz, invalidQuiz)).generate("# doc", responseFormat).catch(() => undefined);

        const span = findSpan(await tracing.spans(), "generate-questions");
        expect(span.status.code).toBe(2);
      });
    });
  });
});
