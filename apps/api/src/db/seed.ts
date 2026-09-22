import bcrypt from "bcrypt";
import { createDb } from "./client.js";
import { users } from "./schema.js";

export const ADMIN_EMAIL = "admin@solvd.com";
export const ADMIN_PASSWORD = "solvdAdmin";
const BCRYPT_ROUNDS = 10;

/**
 * Inserts the single seeded admin user with a bcrypt-hashed password.
 * Idempotent: running it again updates the existing row's hash instead of
 * erroring or creating a duplicate (upsert on the unique `email` column).
 */
export async function seedAdminUser(db: ReturnType<typeof createDb>) {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);

  await db
    .insert(users)
    .values({ email: ADMIN_EMAIL, passwordHash })
    .onConflictDoUpdate({
      target: users.email,
      set: { passwordHash },
    });
}

async function main() {
  const db = createDb();
  await seedAdminUser(db);
  // eslint-disable-next-line no-console
  console.log(`Seeded admin user: ${ADMIN_EMAIL}`);
}

const isDirectRun = /seed\.(ts|js)$/.test(process.argv[1] ?? "");
if (isDirectRun) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}
