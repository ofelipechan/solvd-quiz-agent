/**
 * Ad-hoc smoke script (not part of the test suite, not CI-gated) proving
 * `DefaultGenerationStrategy` + `fetchMarkdown` together produce a valid
 * 5-8 question quiz from real README URLs (GEN-08).
 *
 * Requires a real `OPENROUTER_API_KEY` in the environment. Run with:
 *   OPENROUTER_API_KEY=sk-... pnpm --filter api exec tsx scripts/smoke-generate.ts
 */
import { fetchMarkdown } from "../src/services/markdown/markdown-fetcher.js";
import { createOpenRouterClient } from "../src/services/llm/openrouter-client.js";
import { DefaultGenerationStrategy } from "../src/services/quiz/default-generation.strategy.js";
import { getOpenRouterApiKey } from "../src/config/env.js";

const SOURCE_URLS = [
  "https://raw.githubusercontent.com/pipecat-ai/pipecat/main/README.md",
  "https://raw.githubusercontent.com/vercel/next.js/canary/README.md",
];

async function run() {
  const client = createOpenRouterClient(getOpenRouterApiKey());
  const strategy = new DefaultGenerationStrategy(client);

  for (const url of SOURCE_URLS) {
    const { content } = await fetchMarkdown(url);
    const quiz = await strategy.generate(content);

    const questionCountOk = quiz.questions.length >= 5 && quiz.questions.length <= 8;
    const optionCountOk = quiz.questions.every((q) => q.options.length === 4);

    // eslint-disable-next-line no-console
    console.log(
      `${url}: ${quiz.questions.length} questions, all 4-option=${optionCountOk}, in-range=${questionCountOk}`,
    );
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
