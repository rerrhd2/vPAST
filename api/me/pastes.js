// ============================================================
// vPast — GET /api/me/pastes
// Lists the signed-in user's own pastes (id, visibility,
// snippet, file count, storage-until).
// ============================================================

import { ok, unauthorized, serverError, json } from "../../lib/helpers.js";
import { getSession } from "../../lib/session.js";
import { listPastesByOwner } from "../../lib/db.js";

const DAY = 24 * 60 * 60 * 1000;
const EXPIRE_OWNER = 365 * DAY; // registered users: files live 1 year

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed" });
  }
  const session = getSession(req);
  if (!session || !session.uid) {
    return unauthorized(res, "Sign in to see your pastes");
  }
  try {
    const pastes = await listPastesByOwner(String(session.uid));
    const list = pastes.map((p) => {
      const files = p.files || [];
      const biggest = files.length ? Math.max(...files.map((f) => Number(f.size) || 0)) : 0;
      const expiresAt = files.length ? Number(p.created) + EXPIRE_OWNER : null;
      return {
        id: p.id,
        created: Number(p.created),
        visibility: p.visibility || "public",
        fileCount: files.length,
        biggest,
        hasText: typeof p.content === "string" && p.content.length > 0,
        snippet: typeof p.content === "string" ? p.content.slice(0, 120) : "",
        expiresAt,
      };
    });
    return ok(res, { pastes: list });
  } catch (err) {
    console.error("GET /api/me/pastes failed:", err);
    return serverError(res, "Could not load your pastes");
  }
}