import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppError } from "../../app.js";
import type { UserRepository } from "../../repositories/user.repository.js";

const TOKEN_EXPIRY = "24h";

/** Thrown on any login failure. Deliberately the same error for a wrong
 * password and an unknown email, so the response never leaks which one
 * happened (no user-enumeration). */
export class InvalidCredentialsError extends AppError {
  constructor() {
    super("invalid credentials", 401);
  }
}

export interface VerifiedToken {
  userId: string;
}

/** Verifies credentials against the seeded user store and issues/verifies JWTs. */
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtSecret: string,
  ) {}

  async login(email: string, password: string): Promise<{ token: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      throw new InvalidCredentialsError();
    }

    const token = jwt.sign({ userId: user.id }, this.jwtSecret, { expiresIn: TOKEN_EXPIRY });
    return { token };
  }

  verifyToken(token: string): VerifiedToken | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as VerifiedToken;
      return { userId: decoded.userId };
    } catch {
      return null;
    }
  }
}
