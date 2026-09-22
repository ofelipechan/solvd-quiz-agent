import Fastify, { type FastifyInstance, type FastifyError } from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { AppError } from "./errors/app.error.js";

/**
 * A typed application error. Services throw these; the global error
 * handler below maps `statusCode` straight to the HTTP response instead
 * of leaking a generic 500 for known failure cases (design's Error
 * Handling Strategy table).
 */
/**
 * Builds a Fastify instance with cookie support and a global error handler.
 * Kept as a factory (not a module-level singleton) so tests can build a
 * fresh instance and use `.inject()` without binding a real port.
 */
export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  app.register(cookie);
  // Scoped to the web app's origin so the JWT cookie round-trips
  // cross-origin in dev (Next.js on :3000, Fastify on :3001).
  app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({ error: error.message });
      return;
    }

    // Validation errors from the Zod type provider carry a statusCode too.
    const maybeStatusCode = error.statusCode;
    if (maybeStatusCode && maybeStatusCode >= 400 && maybeStatusCode < 500) {
      reply.status(maybeStatusCode).send({ error: error.message });
      return;
    }

    app.log.error(error);
    reply.status(500).send({ error: "internal server error" });
  });

  return app;
}
