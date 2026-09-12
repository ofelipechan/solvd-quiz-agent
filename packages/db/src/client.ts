import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

/**
 * Creates a Drizzle client bound to `DATABASE_URL`. Throws at call time
 * (not module load time) if the env var is missing, so importing this
 * module never has a side effect.
 */
export function createDb(connectionString: string = requireDatabaseUrl()) {
  const pool = new Pool({ connectionString });
  return drizzle(pool, { schema });
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return url;
}

export type Db = ReturnType<typeof createDb>;
export * as schema from "./schema.js";
export * from "./schema.js";
