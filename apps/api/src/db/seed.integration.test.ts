import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { createDb } from "./client.js";
import { users } from "./schema.js";
import { seedAdminUser, ADMIN_EMAIL, ADMIN_PASSWORD } from "./seed.js";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres_local:postgres_local@localhost:5432/postgres_local";

describe("seedAdminUser()", () => {
  const db = createDb(DATABASE_URL);

  beforeAll(async () => {
    await db.delete(users).where(eq(users.email, ADMIN_EMAIL));
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.email, ADMIN_EMAIL));
  });

  /**
   * Re-running the seed never duplicates the admin.
   * @scenario "seeding the admin twice leaves exactly one admin row"
   */
  it("leaves one admin row after two runs", async () => {
    await seedAdminUser(db);
    await seedAdminUser(db);

    const rows = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL));
    expect(rows).toHaveLength(1);
  });

  /**
   * The admin password is never persisted in plaintext.
   * @scenario "the seeded password is stored hashed, never in plaintext"
   */
  it("stores the password hashed and verifiable", async () => {
    await seedAdminUser(db);

    const [row] = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL));
    expect(row).toBeDefined();
    expect(row!.passwordHash).not.toBe(ADMIN_PASSWORD);
    const matches = await bcrypt.compare(ADMIN_PASSWORD, row!.passwordHash);
    expect(matches).toBe(true);
  });
});
