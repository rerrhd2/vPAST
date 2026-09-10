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
        id                TEXT PRIMARY KEY,
        content           TEXT,
        created           BIGINT NOT NULL,
        file_name         TEXT,
        file_size         BIGINT,
        file_type         TEXT,
        file_url          TEXT,
        file_download_url TEXT,
        files             JSONB
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         TEXT PRIMARY KEY,
        email      TEXT UNIQUE NOT NULL,
        name       TEXT,
        provider   TEXT NOT NULL DEFAULT 'email',
        created    BIGINT NOT NULL,
        last_login BIGINT
      )
    `);
    for (const column of [
      "file_name TEXT",
      "file_size BIGINT",
      "file_type TEXT",
      "file_url TEXT",
      "file_download_url TEXT",
      "files JSONB",
      "owner_id TEXT",
      "visibility TEXT NOT NULL DEFAULT 'public'",
    ]) {
      await client.query(`ALTER TABLE pastes ADD COLUMN IF NOT EXISTS ${column}`);
    }
  } finally {
    client.release();
  }
}

let schemaInit = null;

async function ensureSchemaCached() {
  if (!schemaInit) {
    schemaInit = ensureSchema().catch((err) => {
      schemaInit = null;
      throw err;
    });
  }
  return schemaInit;
}

export async function insertPaste({ id, content, created, files, ownerId, visibility }) {
  await ensureSchemaCached();
  const client = await getPool().connect();
  try {
    await client.query(
      `INSERT INTO pastes (id, content, created, files, owner_id, visibility)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, content ?? null, created, JSON.stringify(files || []), ownerId || null, visibility || "public"]
    );
  } finally {
    client.release();
  }
}

function parseFiles(row) {
  let files = Array.isArray(row?.files) ? row.files : null;
  if (!Array.isArray(files) && typeof row?.files === "string") {
    try {
      files = JSON.parse(row.files);
    } catch {
      files = null;
    }
  }
  if (!Array.isArray(files) || files.length === 0) {
    // Legacy pasts stored a single file in dedicated columns.
    if (row?.file_url != null) {
      files = [
        {
          name: row.file_name,
          size: row.file_size,
          type: row.file_type,
          url: row.file_url,
          downloadUrl: row.file_download_url,
        },
      ];
    } else {
      files = [];
    }
  }
  return files;
}

export async function findPaste(id) {
  await ensureSchemaCached();
  const client = await getPool().connect();
  try {
    const result = await client.query(
      `SELECT id, content, created, files, file_name, file_size, file_type, file_url, file_download_url, owner_id, visibility
       FROM pastes WHERE id = $1`,
      [id]
    );
    const row = result.rows[0] || null;
    if (!row) return null;
    const files = parseFiles(row);
    return {
      id: row.id,
      content: row.content,
      created: row.created,
      files,
      file: files[0] || null,
      ownerId: row.owner_id || null,
      visibility: row.visibility || "public",
    };
  } finally {
    client.release();
  }
}

export async function setPasteVisibility(id, ownerId, visibility) {
  await ensureSchemaCached();
  const client = await getPool().connect();
  try {
    const result = await client.query(
      `UPDATE pastes SET visibility = $3
       WHERE id = $1 AND owner_id = $2`,
      [id, ownerId, visibility]
    );
    return result.rowCount > 0;
  } finally {
    client.release();
  }
}

export async function deletePasteByOwner(id, ownerId) {
  await ensureSchemaCached();
  const client = await getPool().connect();
  try {
    const result = await client.query(
      `DELETE FROM pastes WHERE id = $1 AND owner_id = $2`,
      [id, ownerId]
    );
    return result.rowCount;
  } finally {
    client.release();
  }
}

export async function listPastesByOwner(ownerId) {
  await ensureSchemaCached();
  const client = await getPool().connect();
  try {
    const result = await client.query(
      `SELECT id, content, created, visibility, files, file_name, file_size, file_type, file_url, file_download_url
       FROM pastes WHERE owner_id = $1 ORDER BY created DESC`,
      [ownerId]
    );
    return result.rows.map((row) => {
      const files = parseFiles(row);
      return {
        id: row.id,
        content: row.content,
        created: row.created,
        visibility: row.visibility || "public",
        files,
        file: files[0] || null,
      };
    });
  } finally {
    client.release();
  }
}

export async function upsertUser({ email, name, provider }) {
  await ensureSchemaCached();
  const client = await getPool().connect();
  try {
    const now = Date.now();
    const result = await client.query(
      `INSERT INTO users (id, email, name, provider, created, last_login)
       VALUES ($1, $2, $3, $4, $5, $5)
       ON CONFLICT (email) DO UPDATE SET
         name = COALESCE(EXCLUDED.name, users.name),
         provider = COALESCE(EXCLUDED.provider, users.provider),
         last_login = EXCLUDED.last_login
       RETURNING id, email, name, provider, created`,
      [email, email, name || null, provider || "email", now]
    );
    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name || "",
      provider: row.provider,
      created: Number(row.created) || 0,
    };
  } finally {
    client.release();
  }
}

export async function deletePaste(id) {

export async function clearPastes() {
  await ensureSchemaCached();
  const client = await getPool().connect();
  try {
    const result = await client.query(`DELETE FROM pastes`);
    return result.rowCount;
  } finally {
    client.release();
  }
}

export async function adminStats() {
  await ensureSchemaCached();
  const client = await getPool().connect();
  try {
    const count = await client.query(`SELECT count(*)::int AS pastes FROM pastes`);
    const agg = await client.query(
      `SELECT
         COALESCE(SUM(jsonb_array_length(files)), 0)::int AS files,
         COALESCE(SUM(
           (SELECT COALESCE(SUM((f ->> 'size')::bigint), 0)
            FROM jsonb_array_elements(p.files) f)
         ), 0)::bigint AS bytes
       FROM pastes p
       WHERE jsonb_typeof(files) = 'array'`
    );
    const rows = await client.query(
      `SELECT id, created, content, files
       FROM pastes ORDER BY created DESC LIMIT 50`
    );
    const list = rows.rows.map((row) => {
      const filesArr = parseFiles(row);
      return {
        id: row.id,
        created: Number(row.created) || 0,
        hasText: typeof row.content === "string" && row.content.length > 0,
        fileCount: filesArr.length,
      };
    });
    return {
      pastes: Number(count.rows[0].pastes) || 0,
      files: Number(agg.rows[0].files) || 0,
      bytes: Number(agg.rows[0].bytes) || 0,
      list,
    };
  } finally {
    client.release();
  }
}