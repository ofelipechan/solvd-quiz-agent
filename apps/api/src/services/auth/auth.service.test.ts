import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { InvalidCredentialsError } from "../../errors/auth.errors.js";
import type { User } from "../../models/user.model.js";
import type { UserRepository } from "../../repositories/user.repository.js";
import { AuthService } from "./auth.service.js";

const JWT_SECRET = "test-secret";
process.env.JWT_SECRET = JWT_SECRET;

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
    service = new AuthService(userRepository as unknown as UserRepository);
  });

  describe("login()", () => {
    describe("given the admin exists", () => {
      /**
       * Valid credentials start a session that identifies the admin.
       * @scenario "correct credentials produce a session token for the admin"
       */
      it("issues a session identifying the admin", async () => {
        const { token } = await service.login("admin@solvd.com", "solvdAdmin");
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
        expect(decoded.userId).toBe("11111111-1111-1111-1111-111111111111");
      });

      /**
       * A wrong password is refused as invalid credentials, not a generic failure.
       * @scenario "a wrong password is rejected as invalid credentials"
       */
      it("rejects a wrong password as invalid credentials", async () => {
        await expect(service.login("admin@solvd.com", "wrong")).rejects.toBeInstanceOf(
          InvalidCredentialsError,
        );
      });
    });

    describe("given no user has the email", () => {
      /**
       * Unknown emails fail the same way as wrong passwords so accounts cannot be enumerated.
       * @scenario "an unknown email is rejected exactly like a wrong password"
       */
      it("rejects with the same invalid-credentials outcome", async () => {
        userRepository.findByEmail.mockResolvedValue(null);
        await expect(service.login("nobody@solvd.com", "whatever")).rejects.toBeInstanceOf(
          InvalidCredentialsError,
        );
      });
    });
  });

  describe("verifyToken()", () => {
    /**
     * An expired session must not resolve a user.
     * @scenario "an expired session token yields no user"
     */
    it("resolves no user from an expired session", () => {
      const expired = jwt.sign({ userId: "u1" }, JWT_SECRET, { expiresIn: -1 });
      expect(service.verifyToken(expired)).toBeNull();
    });

    /**
     * A live session resolves the user it was issued for.
     * @scenario "a valid session token yields its user id"
     */
    it("resolves the user from a valid session", () => {
      const valid = jwt.sign({ userId: "u1" }, JWT_SECRET, { expiresIn: "24h" });
      expect(service.verifyToken(valid)).toEqual({ userId: "u1" });
    });
  });
});
