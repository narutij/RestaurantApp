import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool, types } = pg;
import * as schema from "@shared/schema";

// Fix timestamp parsing: treat 'timestamp without time zone' as UTC
// This prevents timezone mismatches between PostgreSQL and Node.js
types.setTypeParser(1114, (str: string) => new Date(str + '+00'));

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Ensure PostgreSQL session uses UTC for NOW() and other time functions
pool.on('connect', (client) => {
  client.query("SET timezone = 'UTC'");
});

export const db = drizzle(pool, { schema });
