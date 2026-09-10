// ============================================================
// vPast — POST /api/admin/clear (admin-only)
// Deletes EVERY paste. Destructive.
// ============================================================

import { ok, json, serverError } from "../../lib/helpers.js";
import { isAdminReq } from "../../lib/admin.js";
import { clearPastes } from "../../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }
  if (!isAdminReq(req)) {
    return json(res, 403, { error: "Forbidden" });
  }
  try {
    const removed = await clearPastes();
    return ok(res, { ok: true, removed });
  } catch (err) {
    console.error("POST /api/admin/clear failed:", err);
    return serverError(res, "Could not clear pastes");
  }
}