import Fastify, { type FastifyInstance, type FastifyError } from "fastify";
import cookie from "@fastify/cookie";

/**
 * A typed application error. Services throw these; the global error
 * handler below maps `statusCode` straight to the HTTP response instead
 * of leaking a generic 500 for known failure cases (design's Error
 * Handling Strategy table).
 */
export class AppError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
  }
}

/**
 * Builds a Fastify instance with cookie support and a global error handler.
 * Kept as a factory (not a module-level singleton) so tests can build a
 * fresh instance and use `.inject()` without binding a real port.
 */
export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  app.register(cookie);

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
