// Must be the first import: registers the Langfuse span processor before any traced module loads.
import { shutdownTracing } from "./observability/instrumentation.js";
import { createDb } from "./db/client.js";
import { buildApp } from "./app.js";
import { UserRepository } from "./repositories/user.repository.js";
import { QuizRepository } from "./repositories/quiz.repository.js";
import { AuthService } from "./services/auth/auth.service.js";
import { fetchMarkdown } from "./services/markdown/markdown-fetcher.js";
import { OpenRouterClient } from "./services/llm/openrouter-client.js";
import { DefaultGenerationStrategy } from "./services/quiz/default-generation.strategy.js";
import { QuizService } from "./services/quiz/quiz.service.js";
import { registerAuthRoutes } from "./routes/auth.routes.js";
import { registerQuizRoutes } from "./routes/quizzes.routes.js";

const app = buildApp();

const db = createDb();
const userRepository = new UserRepository(db);
const quizRepository = new QuizRepository(db);
const authService = new AuthService(userRepository);
const openRouterClient = new OpenRouterClient(process.env.OPENROUTER_API_KEY ?? "");
const generationStrategy = new DefaultGenerationStrategy(openRouterClient);
const quizService = new QuizService(fetchMarkdown, generationStrategy, quizRepository);

registerAuthRoutes(app, authService);
registerQuizRoutes(app, authService, quizService);

const port = Number(process.env.PORT ?? 3001);

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => {
    console.log(`api listening on :${port}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

/** Stops accepting requests, then flushes buffered traces so the tail of the trace stream is not lost. */
async function shutdown(signal: NodeJS.Signals) {
  console.log(`${signal} received, shutting down`);
  await app.close();
  await shutdownTracing();
  process.exit(0);
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => void shutdown(signal));
}
