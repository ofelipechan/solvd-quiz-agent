import type { FastifyRequest, FastifyReply } from "fastify";
import { AppError } from "../app.js";
import type { AuthService } from "../services/auth/auth.service.js";

export const AUTH_COOKIE_NAME = "auth_token";

class UnauthorizedError extends AppError {
  constructor() {
    super("unauthorized", 401);
  }
}

/**
 * Fastify `onRequest` hook: rejects with 401 when the auth cookie is
 * missing, malformed, or expired. On success, attaches `request.userId`.
 */
export function createAuthHook(authService: AuthService) {
  return async function authHook(request: FastifyRequest, _reply: FastifyReply) {
    const token = request.cookies[AUTH_COOKIE_NAME];
    if (!token) {
      throw new UnauthorizedError();
    }

    const verified = authService.verifyToken(token);
    if (!verified) {
      throw new UnauthorizedError();
    }

    request.userId = verified.userId;
  };
}

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
}
