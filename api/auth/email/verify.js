// ============================================================
// vPast — POST /api/auth/email/verify { token }
// Fallback for the "paste the code from the email" path. On
// success sets the session cookie and returns { ok: true }.
// ============================================================

import { ok, badRequest, json, readJsonBody } from "../../../lib/helpers.js";
import { upsertUser } from "../../../lib/db.js";
import { verifyToken, toSession, signToken, setSessionCookie } from "../../../lib/session.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }
  const body = await readJsonBody(req);
  const token = String(body.token || body.code || "").trim();
  const payload = verifyToken(token);
  if (!payload || payload.purpose !== "login" || !payload.e) {
    return badRequest(res, "Invalid or expired code");
  }

  const email = String(payload.e).toLowerCase();
  const user = await upsertUser({ email, name: null, provider: "magic" });
  setSessionCookie(res, signToken(toSession(user)));
  return ok(res, { ok: true });
}