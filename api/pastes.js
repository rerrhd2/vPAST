// ============================================================
// vPast — POST /api/pastes
// Creates a paste: validates content, generates a unique ID,
// persists to PostgreSQL, returns { id, url }.
// ============================================================

import { ensureSchema, insertPaste } from "../lib/db.js";
import { generateId } from "../lib/id.js";
import { ok, badRequest, serverError, readJsonBody, json } from "../lib/helpers.js";

const MAX_ID_ATTEMPTS = 10;

function makeUrl(id, base) {
  return `${base}/p/${id}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req);
    const raw = typeof body.content === "string" ? body.content : "";

    if (!raw.trim()) {
      return badRequest(res, "Nothing to paste yet");
    }

    await ensureSchema();

    let id = null;
    for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt++) {
      const candidate = generateId();
      try {
        await insertPaste({
          id: candidate,
          content: raw,
          created: Date.now(),
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