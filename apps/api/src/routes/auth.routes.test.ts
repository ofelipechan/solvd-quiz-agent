import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createDb, users } from "../db/client.js";
import { seedAdminUser, ADMIN_EMAIL as SEEDED_ADMIN_EMAIL, ADMIN_PASSWORD as SEEDED_ADMIN_PASSWORD } from "../db/seed.js";
import { eq } from "drizzle-orm";
import { buildApp } from "../app.js";
import { registerAuthRoutes } from "./auth.routes.js";
import { createAuthHook, AUTH_COOKIE_NAME } from "../plugins/auth-hook.js";
import { AuthService } from "../services/auth/auth.service.js";
import type { User } from "../models/user.model.js";
import { UserRepository as RealUserRepository } from "../repositories/user.repository.js";
import type { UserRepository } from "../repositories/user.repository.js";

const JWT_SECRET = "test-secret";
process.env.JWT_SECRET = JWT_SECRET;
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
  const authService = new AuthService(fakeUserRepository(passwordHash));
  const app = buildApp();
  registerAuthRoutes(app, authService);

  // A protected route standing in for the real /api/quizzes* routes, so the
  // auth hook can be proven without depending on the quiz routes.
  app.get("/api/protected", { onRequest: createAuthHook(authService) }, async () => ({ ok: true }));

  await app.ready();
  return { app, authService };
}

describe("POST /api/auth/login", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>["app"];

  beforeEach(async () => {
    ({ app } = await buildTestApp());
  });

  /**
   * A successful sign-in starts a session that browser scripts cannot read.
   * @scenario "signing in with valid credentials starts a browser-only session"
   */
  it("succeeds and starts a browser-only session", async () => {
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

  /**
   * Wrong credentials never start a session.
   * @scenario "signing in with a wrong password is rejected without a session"
   */
  it("is rejected as unauthenticated with no session", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: ADMIN_EMAIL, password: "wrong" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });
});

describe("POST /api/auth/logout", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>["app"];

  beforeEach(async () => {
    ({ app } = await buildTestApp());
  });

  /**
   * Signing out removes the session from the browser.
   * @scenario "signing out ends the session"
   */
  it("succeeds and clears the session", async () => {
    const res = await app.inject({ method: "POST", url: "/api/auth/logout" });

    expect(res.statusCode).toBe(200);
    const setCookie = res.headers["set-cookie"];
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookieStr).toContain(`${AUTH_COOKIE_NAME}=;`);
  });
});

describe("auth hook on a protected route", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>["app"];

  beforeEach(async () => {
    ({ app } = await buildTestApp());
  });

  describe("given no session cookie", () => {
    /**
     * Anonymous requests never reach protected resources.
     * @scenario "a protected action without a session is rejected"
     */
    it("is rejected as unauthenticated", async () => {
      const res = await app.inject({ method: "GET", url: "/api/protected" });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("given an expired session cookie", () => {
    /**
     * An expired session is treated as no session.
     * @scenario "a protected action with an expired session is rejected"
     */
    it("is rejected as unauthenticated", async () => {
      const expired = jwt.sign({ userId: "u1" }, JWT_SECRET, { expiresIn: -1 });
      const res = await app.inject({
        method: "GET",
        url: "/api/protected",
        cookies: { [AUTH_COOKIE_NAME]: expired },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("given a valid session cookie", () => {
    /**
     * A live session grants access to protected resources.
     * @scenario "a protected action with a valid session is allowed"
     */
    it("succeeds", async () => {
      const valid = jwt.sign({ userId: "u1" }, JWT_SECRET, { expiresIn: "24h" });
      const res = await app.inject({
        method: "GET",
        url: "/api/protected",
        cookies: { [AUTH_COOKIE_NAME]: valid },
      });
      expect(res.statusCode).toBe(200);
    });
  });
});

describe("POST /api/auth/login against a seeded database", () => {
  const DATABASE_URL =
    process.env.DATABASE_URL ?? "postgres://postgres_local:postgres_local@localhost:5432/postgres_local";
  const db = createDb(DATABASE_URL);

  beforeAll(async () => {
    await seedAdminUser(db);
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, SEEDED_ADMIN_EMAIL));
  });

  /**
   * The seeded admin account works end to end through the real user store.
   * @scenario "the seeded admin can sign in against a real database"
   */
  it("succeeds for the seeded credentials", async () => {
    const authService = new AuthService(new RealUserRepository(db));
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
