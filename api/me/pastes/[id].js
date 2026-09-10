// ============================================================
// vPast — PATCH/DELETE /api/me/pastes/:id (owner only)
// PATCH { visibility: "public" | "private" }
// DELETE → remove the paste.
// ============================================================

import { ok, badRequest, unauthorized, notFound, serverError, json, readJsonBody } from "../../../lib/helpers.js";
import { getSession } from "../../../lib/session.js";
import { setPasteVisibility, deletePasteByOwner } from "../../../lib/db.js";

export default async function handler(req, res) {
  const session = getSession(req);
  if (!session || !session.uid) {
    return unauthorized(res, "Sign in first");
  }
  const ownerId = String(session.uid);
  const { id } = req.query;
  if (!id || !/^[0-9a-zA-Z]{1,24}$/.test(id)) {
    return notFound(res, "Past not found");
  }

  if (req.method === "PATCH") {
    const body = await readJsonBody(req);
    const visibility = body.visibility === "private" ? "private" : "public";
    try {
      const done = await setPasteVisibility(id, ownerId, visibility);
      if (!done) return notFound(res, "Past not found");
      return ok(res, { ok: true, visibility });
    } catch (err) {
      console.error("PATCH /api/me/pastes failed:", err);
      return serverError(res, "Could not update the paste");
    }
  }

  if (req.method === "DELETE") {
    try {
      const removed = await deletePasteByOwner(id, ownerId);
      if (!removed) return notFound(res, "Past not found");
      return ok(res, { ok: true, removed: 1 });
    } catch (err) {
      console.error("DELETE /api/me/pastes failed:", err);
      return serverError(res, "Could not delete the paste");
    }
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return json(res, 405, { error: "Method not allowed" });
}