// ============================================================
// vPast — POST /api/pastes
// Creates a paste: validates content, generates a unique ID,
// persists to PostgreSQL, returns { id, url }.
// ============================================================

import { ensureSchema, insertPaste } from "../lib/db.js";
import { generateId } from "../lib/id.js";
import { ok, badRequest, serverError, readJsonBody, json } from "../lib/helpers.js";
import { getSession } from "../lib/session.js";

const MAX_ID_ATTEMPTS = 10;
const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024;

function makeUrl(id, base) {
  return `${base}/p/${id}`;
}

function sanitizeFile(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 255) : "";
  const url = typeof raw.url === "string" ? raw.url : "";
  const downloadUrl = typeof raw.downloadUrl === "string" ? raw.downloadUrl : "";
  const size = Number(raw.size);
  const type = typeof raw.type === "string" ? raw.type.slice(0, 255) : "";

  if (!name || !/^https?:\/\//.test(url)) return null;
  if (!Number.isFinite(size) || size < 0 || size > MAX_FILE_BYTES) return null;

  return { name, url, downloadUrl, size, type };
}

function sanitizeFiles(raw) {
  if (raw === undefined || raw === null) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const files = [];
  for (const item of list) {
    const file = sanitizeFile(item);
    if (!file) return null;
    files.push(file);
  }
  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > MAX_TOTAL_BYTES) return null;
  return files;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req);
    const rawText = typeof body.content === "string" ? body.content : "";
    const content = rawText.trim();
    const files = sanitizeFiles(body.files !== undefined ? body.files : body.file);
    if (files === null) {
      return badRequest(res, "File size limit exceeded (max 2 GB total)");
    }

    if (!content && files.length === 0) {
      return badRequest(res, "Nothing to paste yet");
    }

    // Optional ownership + privacy (only signed-in users can own a paste).
    const session = getSession(req);
    const ownerId = session && session.uid ? String(session.uid) : null;
    const visibility = ownerId && body.visibility === "private" ? "private" : "public";

    await ensureSchema();

    let id = null;
    for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
      const candidate = generateId();
      try {
        await insertPaste({
          id: candidate,
          content: content || null,
          created: Date.now(),
          files,
          ownerId,
          visibility,
        });
        id = candidate;
        break;
      } catch (err) {
        // unique violation (23505) -> retry with a new id
        if (err && err.code === "23505") continue;
        throw err;
      }
    }

    if (!id) {
      return serverError(res, "Could not allocate a unique id");
    }

    const base =
      process.env.VERCEL_URL && !process.env.NODE_ENV?.includes("dev")
        ? `https://${process.env.VERCEL_URL}`
        : `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}`;

    return ok(res, { id, url: makeUrl(id, base) });
  } catch (err) {
    console.error("POST /api/pastes failed:", err);
    return serverError(res, "Could not create Past");
  }
}