import { createDb } from "@quiz-agent/db";
import { buildApp } from "./app.js";
import { getOpenRouterApiKey } from "./config/env.js";
import { UserRepository } from "./repositories/user.repository.js";
import { QuizRepository } from "./repositories/quiz.repository.js";
import { AuthService } from "./services/auth/auth.service.js";
import { fetchMarkdown } from "./services/markdown/markdown-fetcher.js";
import { createOpenRouterClient } from "./services/llm/openrouter-client.js";
import { DefaultGenerationStrategy } from "./services/quiz/default-generation.strategy.js";
import { QuizService } from "./services/quiz/quiz.service.js";
import { registerAuthRoutes } from "./routes/auth.routes.js";
import { registerQuizRoutes } from "./routes/quizzes.routes.js";

function requireJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return secret;
}

const app = buildApp();

const db = createDb();
const userRepository = new UserRepository(db);
const quizRepository = new QuizRepository(db);
const authService = new AuthService(userRepository, requireJwtSecret());
const openRouterClient = createOpenRouterClient(getOpenRouterApiKey());
const generationStrategy = new DefaultGenerationStrategy(openRouterClient);
const quizService = new QuizService(fetchMarkdown, generationStrategy, quizRepository);

registerAuthRoutes(app, authService);
registerQuizRoutes(app, authService, quizService);

const port = Number(process.env.PORT ?? 3001);

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => {
    // eslint-disable-next-line no-console
    console.log(`api listening on :${port}`);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
