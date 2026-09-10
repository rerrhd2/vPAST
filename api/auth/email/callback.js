// ============================================================
// vPast — GET /api/auth/email/callback?t=<magic link token>
// Validates the login token, upserts the user, sets the session
// cookie and redirects to /me.
// ============================================================

import { upsertUser } from "../../../lib/db.js";
import { verifyToken, toSession, signToken, sessionCookieValue } from "../../../lib/session.js";

export default async function handler(req, res) {
  const token = req.query.t || "";
  const payload = verifyToken(token);
  if (!payload || payload.purpose !== "login" || !payload.e) {
    res.writeHead(302, { Location: "/?auth=badlink" });
    return res.end();
  }

  try {
    const email = String(payload.e).toLowerCase();
    const user = await upsertUser({ email, name: null, provider: "magic" });
    const session = toSession(user);
    const sessionToken = signToken(session);
    const cookie = sessionCookieValue(sessionToken);
    res.writeHead(302, { Location: "/me", "Set-Cookie": cookie });
    return res.end();
  } catch (err) {
    console.error("email callback failed:", err);
    res.writeHead(302, { Location: "/?auth=error" });
    return res.end();
  }
}