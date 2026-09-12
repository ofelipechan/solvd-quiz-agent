import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AuthService, InvalidCredentialsError } from "./auth.service.js";
import type { UserRepository, User } from "../../repositories/user.repository.js";

const JWT_SECRET = "test-secret";

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    email: "admin@solvd.com",
    passwordHash: "",
    createdAt: new Date(),
    ...overrides,
  };
}

describe("AuthService", () => {
  let userRepository: { findByEmail: ReturnType<typeof vi.fn> };
  let service: AuthService;

  beforeEach(async () => {
    const passwordHash = await bcrypt.hash("solvdAdmin", 10);
    userRepository = { findByEmail: vi.fn().mockResolvedValue(fakeUser({ passwordHash })) };
    service = new AuthService(userRepository as unknown as UserRepository, JWT_SECRET);
  });

  /** Spec AC (AUTH-01): valid credentials resolve a signed JWT. */
  it("resolves a token for correct credentials", async () => {
    const { token } = await service.login("admin@solvd.com", "solvdAdmin");
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    expect(decoded.userId).toBe("11111111-1111-1111-1111-111111111111");
  });

  /** Spec AC (AUTH-02): wrong password rejects with InvalidCredentialsError, not a generic error. */
  it("throws InvalidCredentialsError on wrong password", async () => {
    await expect(service.login("admin@solvd.com", "wrong")).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  /** Spec AC (AUTH-02) + no user-enumeration leak: unknown email throws the same error type as wrong password. */
  it("throws InvalidCredentialsError for an unknown email, not a distinct error", async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    await expect(service.login("nobody@solvd.com", "whatever")).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  /** Design: verifyToken(24h expiry) rejects an expired token instead of returning stale user context. */
  it("fails verifyToken for an expired token", () => {
    const expired = jwt.sign({ userId: "u1" }, JWT_SECRET, { expiresIn: -1 });
    expect(service.verifyToken(expired)).toBeNull();
  });

  /** verifyToken resolves the userId for a valid, unexpired token. */
  it("resolves userId for a valid token", () => {
    const valid = jwt.sign({ userId: "u1" }, JWT_SECRET, { expiresIn: "24h" });
    expect(service.verifyToken(valid)).toEqual({ userId: "u1" });
  });
});
