// ============================================================
// vPast — POST /api/admin/delete (admin-only)
// Deletes one paste by id.
// ============================================================

import { readJsonBody, ok, json, serverError } from "../../lib/helpers.js";
import { isAdminReq } from "../../lib/admin.js";
import { deletePaste } from "../../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }
  if (!isAdminReq(req)) {
    return json(res, 403, { error: "Forbidden" });
  }

  const body = await readJsonBody(req);
  const id = String(body.id || "").trim();
  if (!id || !/^[0-9a-zA-Z]{1,24}$/.test(id)) {
    return json(res, 400, { error: "Invalid paste id" });
  }

  try {
    const removed = await deletePaste(id);
    return ok(res, { ok: true, removed });
  } catch (err) {
    console.error("POST /api/admin/delete failed:", err);
    return serverError(res, "Could not delete Past");
  }
}