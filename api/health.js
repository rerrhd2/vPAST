// ============================================================
// vPast — GET /api/health
// Used by the frontend to detect serverless API + DB presence.
// ============================================================

import { getPool } from "../lib/db.js";
import { ok, serverError, json } from "../lib/helpers.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed" });
  }
  try {
    const pool = getPool();
    const result = await pool.query("SELECT 1 AS ok");
    const db = result.rows && result.rows[0] && result.rows[0].ok === 1;
    return ok(res, { ok: true, db: db ? "ok" : "error" });
  } catch (err) {
    console.error("GET /api/health failed:", err);
    return serverError(res, "Database unavailable");
  }
}