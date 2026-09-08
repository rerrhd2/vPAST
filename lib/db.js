// ============================================================
// vPast — PostgreSQL connection (Neon / any Postgres)
// Uses DATABASE_URL from Vercel env. Connection pool created
// lazily and reused across serverless invocations.
// ============================================================

import pg from "pg";

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }
  pool = new Pool({
    connectionString,
    max: 5,
    ssl:
      process.env.DATABASE_SSL === "false"
        ? false
        : { rejectUnauthorized: false },
  });
  return pool;
}

export async function ensureSchema() {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS pastes (
        id        TEXT PRIMARY KEY,
        content   TEXT NOT NULL,
        created   BIGINT NOT NULL
      )
    `);
  } finally {
    client.release();
  }
}

export async function insertPaste({ id, content, created }) {
  const client = await getPool().connect();
  try {
    await client.query(
      "INSERT INTO pastes (id, content, created) VALUES ($1, $2, $3)",
      [id, content, created]
    );
  } finally {
    client.release();
  }
}

export async function findPaste(id) {
  const client = await getPool().connect();
  try {
    const result = await client.query(
      "SELECT id, content, created FROM pastes WHERE id = $1",
      [id]
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}