import type { FastifyInstance } from "fastify";
import { LoginRequestSchema } from "@quiz-agent/shared";
import type { AuthService } from "../services/auth/auth.service.js";
import { AUTH_COOKIE_NAME } from "../plugins/auth-hook.js";

const COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60; // 24h, matches AuthService's JWT expiry

/** Registers `POST /api/auth/login` and `POST /api/auth/logout`. */
export function registerAuthRoutes(app: FastifyInstance, authService: AuthService) {
  app.post("/api/auth/login", async (request, reply) => {
    const body = LoginRequestSchema.parse(request.body);
    const { token } = await authService.login(body.email, body.password);

    reply.setCookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SECONDS,
    });
    reply.status(200).send({ ok: true });
  });

  app.post("/api/auth/logout", async (_request, reply) => {
    reply.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
    reply.status(200).send({ ok: true });
  });
}
