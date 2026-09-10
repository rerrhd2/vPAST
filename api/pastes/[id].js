// ============================================================
// vPast — GET /api/pastes/:id
// Returns a stored paste or 404.
// ============================================================

import { findPaste } from "../../lib/db.js";
import { ok, notFound, serverError, json } from "../../lib/helpers.js";

const GB = 1024 * 1024 * 1024;
const DAY = 24 * 60 * 60 * 1000;
const EXPIRE_BIG = 14 * DAY; // files > 1 GB
const EXPIRE_SMALL = 90 * DAY; // files <= 1 GB

function isExpired(paste) {
  const files = paste.files || [];
  if (files.length === 0) return false;
  const biggest = Math.max(...files.map((f) => Number(f.size) || 0));
  const lifetime = biggest > GB ? EXPIRE_BIG : EXPIRE_SMALL;
  return Date.now() - Number(paste.created) > lifetime;
}

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
    if (!paste || isExpired(paste)) {
      return notFound(res, "Past not found");
    }
    return ok(res, {
      id: paste.id,
      content: paste.content,
      created: Number(paste.created),
      files: paste.files,
      file: paste.file,
    });
  } catch (err) {
    console.error(`GET /api/pastes/${id} failed:`, err);
    return serverError(res, "Could not load Past");
  }
}