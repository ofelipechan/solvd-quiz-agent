import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { createDb } from "./client.js";
import { users } from "./schema.js";
import { seedAdminUser, ADMIN_EMAIL, ADMIN_PASSWORD } from "./seed.js";

// SPEC_DEVIATION: tasks.md's T5 "Done when" describes asserting via
// `UserRepository.findByEmail`, but that repository is built in T7 (Phase
// 2), out of order relative to this task. Asserting via a direct Drizzle
// query here proves the same persisted state without introducing a
// forward dependency on a later task's file.

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://quiz_agent:quiz_agent@localhost:5432/quiz_agent";

describe("seedAdminUser (integration)", () => {
  const db = createDb(DATABASE_URL);

  beforeAll(async () => {
    await db.delete(users).where(eq(users.email, ADMIN_EMAIL));
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, ADMIN_EMAIL));
  });

  /** Spec AC (AUTH-04): running the seed twice does not error or duplicate the user row. */
  it("is idempotent when run twice", async () => {
    await seedAdminUser(db);
    await seedAdminUser(db);

    const rows = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL));
    expect(rows).toHaveLength(1);
  });

  /** Spec AC (AUTH-04): the seeded password is stored as a bcrypt hash, never plaintext, and verifies against the known password. */
  it("stores a bcrypt-verifiable password hash, never plaintext", async () => {
    await seedAdminUser(db);

    const [row] = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL));
    expect(row).toBeDefined();
    expect(row!.passwordHash).not.toBe(ADMIN_PASSWORD);
    const matches = await bcrypt.compare(ADMIN_PASSWORD, row!.passwordHash);
    expect(matches).toBe(true);
  });
});
