// ============================================================
// vPast — POST /api/auth/email/request
// Sends a magic-link login email. Also returns a devLink when
// SMTP is not configured (local dev / serve.ps1).
// ============================================================

import { ok, badRequest, json, readJsonBody, originOf } from "../../../lib/helpers.js";
import { signToken } from "../../../lib/session.js";
import { sendLoginEmail } from "../../../lib/mail.js";

const LOGIN_TTL_MS = 15 * 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }
  const body = await readJsonBody(req);
  const email = String(body.email || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return badRequest(res, "Invalid email address");
  }

  const origin = originOf(req);
  const token = signToken({ e: email, purpose: "login" }, LOGIN_TTL_MS);
  const magicUrl = `${origin}/api/auth/email/callback?t=${encodeURIComponent(token)}`;

  try {
    const sent = await sendLoginEmail({ to: email, origin, magicUrl, token });
    return ok(res, { ok: true, ...(sent && sent.dev ? { devLink: sent.link } : {}) });
  } catch (err) {
    console.error("POST /api/auth/email/request failed:", err);
    return json(res, 502, { error: "Could not send the email — check SMTP settings" });
  }
}