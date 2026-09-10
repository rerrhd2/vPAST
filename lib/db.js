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
    for (const column of [
      "file_name TEXT",
      "file_size BIGINT",
      "file_type TEXT",
      "file_url TEXT",
      "file_download_url TEXT",
      "files JSONB",
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

export async function insertPaste({ id, content, created, files }) {
  await ensureSchemaCached();
  const client = await getPool().connect();
  try {
    await client.query(
      `INSERT INTO pastes (id, content, created, files)
       VALUES ($1, $2, $3, $4)`,
      [id, content ?? null, created, JSON.stringify(files || [])]
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
      `SELECT id, content, created, files, file_name, file_size, file_type, file_url, file_download_url
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
    };
  } finally {
    client.release();
  }
}

export async function deletePaste(id) {
  await ensureSchemaCached();
  const client = await getPool().connect();
  try {
    const result = await client.query(`DELETE FROM pastes WHERE id = $1`, [id]);
    return result.rowCount;
  } finally {
    client.release();
  }
}

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