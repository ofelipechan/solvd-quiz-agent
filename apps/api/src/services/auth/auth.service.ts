import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { InvalidCredentialsError } from "../../errors/auth.errors.js";
import type { VerifiedToken } from "../../models/auth.model.js";
import type { UserRepository } from "../../repositories/user.repository.js";

const TOKEN_EXPIRY = "24h";

/** Verifies credentials against the seeded user store and issues/verifies JWTs. */
export class AuthService {
  private readonly jwtSecret: string;

  constructor(
    private readonly userRepository: UserRepository,
  ) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET environment variable is not set");
    }
    this.jwtSecret = jwtSecret;
  }

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
