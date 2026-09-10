// ============================================================
// vPast — GET /api/pastes/:id
// Returns a stored paste or 404. Private pastes are visible only
// to their owner. Registered users get a 1-year file lifetime
// (anonymous: 14 days > 1 GB / 3 months ≤ 1 GB; text lives forever).
// ============================================================

import { findPaste } from "../../lib/db.js";
import { ok, notFound, forbidden, serverError, json } from "../../lib/helpers.js";
import { getSession } from "../../lib/session.js";

const GB = 1024 * 1024 * 1024;
const DAY = 24 * 60 * 60 * 1000;
const EXPIRE_BIG = 14 * DAY; // anonymous files > 1 GB
const EXPIRE_SMALL = 90 * DAY; // anonymous files <= 1 GB
const EXPIRE_OWNER = 365 * DAY; // files of a registered user

function expiredAt(paste) {
  const files = paste.files || [];
  if (files.length === 0) return null; // pure text lives forever
  const biggest = Math.max(...files.map((f) => Number(f.size) || 0));
  const owner = Boolean(paste.ownerId);
  const lifetime = owner ? EXPIRE_OWNER : biggest > GB ? EXPIRE_BIG : EXPIRE_SMALL;
  return Number(paste.created) + lifetime;
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
    if (!paste) {
      return notFound(res, "Past not found");
    }
    const exp = expiredAt(paste);
    if (exp !== null && exp < Date.now()) {
      return notFound(res, "Past not found");
    }

    // Privacy gate.
    if (paste.visibility === "private") {
      const session = getSession(req);
      const uid = session && session.uid ? String(session.uid) : null;
      if (!uid || uid !== String(paste.ownerId)) {
        return forbidden(res, "This past is private — only its owner can view it");
      }
    }

    return ok(res, {
      id: paste.id,
      content: paste.content,
      created: Number(paste.created),
      visibility: paste.visibility,
      owner: paste.ownerId ? true : false,
      expiresAt: exp,
      files: paste.files,
      file: paste.file,
    });
  } catch (err) {
    console.error(`GET /api/pastes/${id} failed:`, err);
    return serverError(res, "Could not load Past");
  }
}