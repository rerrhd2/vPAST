// ============================================================
// vPast — GET /api/auth/google/start
// Redirects to Google OAuth (PKCE). Stores state+verifier in a
// short-lived HttpOnly cookie. Env: GOOGLE_CLIENT_ID/SECRET.
// ============================================================

import { ok, json, originOf } from "../../../lib/helpers.js";
import { configured, makeStateAndVerifier, authUrl, OAUTH_COOKIE } from "../../../lib/google.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed" });
  }
  if (!configured()) {
    return json(res, 501, { error: "Google Sign-In is not configured (GOOGLE_CLIENT_ID)" });
  }

  const origin = originOf(req);
  const redirectUri = `${origin}/api/auth/google/callback`;
  const { state, verifier, challenge } = makeStateAndVerifier();

  res.setHeader("Set-Cookie", [
    `${OAUTH_COOKIE}=${encodeURIComponent(`${state}.${verifier}`)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${process.env.VERCEL_URL ? "; Secure" : ""}`,
  ]);
  const url = authUrl({
    clientId: process.env.GOOGLE_CLIENT_ID,
    redirectUri,
    state,
    challenge,
  });
  ok(res, { url });
}