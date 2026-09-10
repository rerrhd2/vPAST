// ============================================================
// vPast — POST /api/auth/logout
// ============================================================

import { ok, json } from "../../lib/helpers.js";
import { clearSession } from "../../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }
  clearSession(res);
  return ok(res, { ok: true });
}