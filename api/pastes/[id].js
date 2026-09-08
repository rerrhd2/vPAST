// ============================================================
// vPast — GET /api/pastes/:id
// Returns a stored paste or 404.
// ============================================================

import { findPaste } from "../../lib/db.js";
import { ok, notFound, serverError, json } from "../../lib/helpers.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed" });
  }

  const { id } = req.query;

  if (!id || !/^[0-9a-zA-Z]{1,24}$/.test(id)) {
    return notFound(res, "Past not found");
  }

  try {
    const paste = await findPaste(id);
    if (!paste) {
      return notFound(res, "Past not found");
    }
    return ok(res, {
      id: paste.id,
      content: paste.content,
      created: Number(paste.created),
    });
  } catch (err) {
    console.error(`GET /api/pastes/${id} failed:`, err);
    return serverError(res, "Could not load Past");
  }
}