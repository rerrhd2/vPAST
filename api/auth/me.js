// ============================================================
// vPast — GET /api/auth/me
// Returns the current session user (or null) + isAdmin flag.
// ============================================================

import { ok, json } from "../../lib/helpers.js";
import { getSession } from "../../lib/session.js";
import { adminEmails } from "../../lib/admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed" });
  }
  const session = getSession(req);
  if (!session || !session.e) {
    return ok(res, { user: null, isAdmin: false });
  }
  const email = String(session.e).toLowerCase();
  const list = adminEmails();
  return ok(res, {
    user: { email, name: session.n || "", provider: session.pr || "email" },
    isAdmin: list.length > 0 && list.includes(email),
  });
}