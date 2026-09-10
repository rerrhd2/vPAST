// ============================================================
// vPast — GET /api/auth/google/callback?code=...&state=...
// Exchanges the code (PKCE), upserts the user and redirects to
// /me with a session cookie.
// ============================================================

import { originOf } from "../../../lib/helpers.js";
import { upsertUser } from "../../../lib/db.js";
import { OAUTH_COOKIE, exchangeCode } from "../../../lib/google.js";
import { readCookie, toSession, signToken, sessionCookieValue } from "../../../lib/session.js";

export default async function handler(req, res) {
  const fail = (loc) => {
    res.writeHead(302, { Location: loc });
    res.end();
  };

  const code = req.query.code || "";
  const state = req.query.state || "";
  const stored = readCookie(req, OAUTH_COOKIE) || "";
  const sep = stored.indexOf(".");
  const storedState = sep >= 0 ? stored.slice(0, sep) : "";
  const verifier = sep >= 0 ? stored.slice(sep + 1) : "";
  if (!code || !state || storedState !== state || !verifier) {
    return fail("/?auth=error");
  }

  const origin = originOf(req);
  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    const info = await exchangeCode({ code, codeVerifier: verifier, redirectUri });
    const email = String(info.email || "").toLowerCase();
    if (!email || info.email_verified !== true) {
      return fail("/?auth=emailnotverified");
    }
    const name = info.name || info.given_name || "";
    const user = await upsertUser({ email, name, provider: "google" });
    const cookie = sessionCookieValue(signToken(toSession(user)));
    res.writeHead(302, { Location: "/me", "Set-Cookie": cookie });
    return res.end();
  } catch (err) {
    console.error("google callback failed:", err);
    return fail("/?auth=error");
  }
}