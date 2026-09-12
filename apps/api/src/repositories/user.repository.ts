import { eq } from "drizzle-orm";
import { users, type Db } from "@quiz-agent/db";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

/** Data access for the `users` table only. */
export class UserRepository {
  constructor(private readonly db: Db) {}

  async findByEmail(email: string): Promise<User | null> {
    const [row] = await this.db.select().from(users).where(eq(users.email, email));
    return row ?? null;
  }
}
