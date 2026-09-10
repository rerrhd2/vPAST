// ============================================================
// vPast — GET /api/admin/stats (admin-only)
// ============================================================

import { ok, json, serverError } from "../../lib/helpers.js";
import { isAdminReq } from "../../lib/admin.js";
import { adminStats } from "../../lib/db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed" });
  }
  if (!isAdminReq(req)) {
    return json(res, 403, { error: "Forbidden" });
  }
  try {
    return ok(res, await adminStats());
  } catch (err) {
    console.error("GET /api/admin/stats failed:", err);
    return serverError(res, "Could not load stats");
  }
}