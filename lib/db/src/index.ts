import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const dbUrl = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString: dbUrl,
  // Supabase (and most managed Postgres hosts) require SSL on port 5432.
  // rejectUnauthorized:false accepts self-signed certs used by Supabase.
  ssl: dbUrl?.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
export { ensureSchema } from "./migrate";
