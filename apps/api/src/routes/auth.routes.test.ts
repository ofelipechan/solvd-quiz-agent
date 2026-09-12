import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createDb, users } from "@quiz-agent/db";
import { seedAdminUser, ADMIN_EMAIL as SEEDED_ADMIN_EMAIL, ADMIN_PASSWORD as SEEDED_ADMIN_PASSWORD } from "@quiz-agent/db/src/seed.js";
import { eq } from "drizzle-orm";
import { buildApp } from "../app.js";
import { registerAuthRoutes } from "./auth.routes.js";
import { createAuthHook, AUTH_COOKIE_NAME } from "../plugins/auth-hook.js";
import { AuthService } from "../services/auth/auth.service.js";
import { UserRepository as RealUserRepository } from "../repositories/user.repository.js";
import type { UserRepository, User } from "../repositories/user.repository.js";

const JWT_SECRET = "test-secret";
const ADMIN_EMAIL = "admin@solvd.com";
const ADMIN_PASSWORD = "solvdAdmin";

function fakeUserRepository(passwordHash: string): UserRepository {
  const user: User = {
    id: "11111111-1111-1111-1111-111111111111",
    email: ADMIN_EMAIL,
    passwordHash,
    createdAt: new Date(),
  };
  return {
    findByEmail: async (email: string) => (email === ADMIN_EMAIL ? user : null),
  } as UserRepository;
}

async function buildTestApp() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const authService = new AuthService(fakeUserRepository(passwordHash), JWT_SECRET);
  const app = buildApp();
  registerAuthRoutes(app, authService);

  // A protected route, standing in for the real /api/quizzes* routes added
  // in T18, so this task can prove the auth hook rejects/accepts requests
  // without depending on a later task's file.
  app.get("/api/protected", { onRequest: createAuthHook(authService) }, async () => ({ ok: true }));

  await app.ready();
  return { app, authService };
}

describe("auth routes", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>["app"];

  beforeEach(async () => {
    ({ app } = await buildTestApp());
  });

  /** Spec AC (AUTH-01): valid login sets an HTTP-only cookie and returns 200. */
  it("sets an http-only cookie and returns 200 on valid login", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });

    expect(res.statusCode).toBe(200);
    const setCookie = res.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookieStr).toContain(`${AUTH_COOKIE_NAME}=`);
    expect(cookieStr?.toLowerCase()).toContain("httponly");
  });

  /** Spec AC (AUTH-02): invalid credentials return 401 and set no cookie. */
  it("returns 401 and no cookie on invalid login", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: ADMIN_EMAIL, password: "wrong" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  /** Spec AC (AUTH-05): logout clears the cookie and returns 200. */
  it("clears the cookie and returns 200 on logout", async () => {
    const res = await app.inject({ method: "POST", url: "/api/auth/logout" });

    expect(res.statusCode).toBe(200);
    const setCookie = res.headers["set-cookie"];
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookieStr).toContain(`${AUTH_COOKIE_NAME}=;`);
  });

  /** Spec AC (AUTH-03): a protected route with no auth cookie returns 401. */
  it("returns 401 for a protected route with no cookie", async () => {
    const res = await app.inject({ method: "GET", url: "/api/protected" });
    expect(res.statusCode).toBe(401);
  });

  /** Edge case: an expired JWT cookie returns 401 on a protected route. */
  it("returns 401 for a protected route with an expired token", async () => {
    const expired = jwt.sign({ userId: "u1" }, JWT_SECRET, { expiresIn: -1 });
    const res = await app.inject({
      method: "GET",
      url: "/api/protected",
      cookies: { [AUTH_COOKIE_NAME]: expired },
    });
    expect(res.statusCode).toBe(401);
  });

  /** Spec AC (AUTH-03): a protected route with a valid cookie succeeds. */
  it("allows a protected route with a valid cookie", async () => {
    const valid = jwt.sign({ userId: "u1" }, JWT_SECRET, { expiresIn: "24h" });
    const res = await app.inject({
      method: "GET",
      url: "/api/protected",
      cookies: { [AUTH_COOKIE_NAME]: valid },
    });
    expect(res.statusCode).toBe(200);
  });
});

describe("auth routes against a seeded database (integration)", () => {
  const DATABASE_URL =
    process.env.DATABASE_URL ?? "postgres://quiz_agent:quiz_agent@localhost:5432/quiz_agent";
  const db = createDb(DATABASE_URL);

  beforeAll(async () => {
    await seedAdminUser(db);
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, SEEDED_ADMIN_EMAIL));
  });

  /** Spec AC (AUTH-04): the seeded admin user can log in through the real route end to end. */
  it("logs in with the seeded admin credentials", async () => {
    const authService = new AuthService(new RealUserRepository(db), JWT_SECRET);
    const app = buildApp();
    registerAuthRoutes(app, authService);
    await app.ready();

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: SEEDED_ADMIN_EMAIL, password: SEEDED_ADMIN_PASSWORD },
    });

    expect(res.statusCode).toBe(200);
  });
});
