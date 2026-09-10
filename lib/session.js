// ============================================================
// vPast — sessions
// Stateless, HMAC-signed, HttpOnly cookie (vpast_session).
// Payload: { e: email, n: name, pr: provider, uid: id, exp }.
// Signature format (both Node and serve.ps1 agree on):
//   base64url(JSON).base64url(hmac_sha256(secret, base64url(JSON)))
// ============================================================

import crypto from "crypto";

export const SESSION_COOKIE = "vpast_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function secret() {
  const s = process.env.VPAST_AUTH_SECRET;
  if (!s) throw new Error("VPAST_AUTH_SECRET is not configured");
  return s;
}

export function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

export function signToken(payload, ttlMs = SESSION_TTL_MS) {
  const body = b64url(JSON.stringify({ ...payload, exp: Date.now() + ttlMs }));
  const sig = b64url(crypto.createHmac("sha256", secret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyToken(token) {
  try {
    if (typeof token !== "string" || !token.includes(".")) return null;
    const sep = token.lastIndexOf(".");
    const body = token.slice(0, sep);
    const sig = token.slice(sep + 1);
    const expect = b64url(crypto.createHmac("sha256", secret()).update(body).digest());
    const a = Buffer.from(sig);
    const b = Buffer.from(expect);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!data || typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function readCookie(req, name = SESSION_COOKIE) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq >= 0 && part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return part.slice(eq + 1).trim();
      }
    }
  }
  return null;
}

export function getSession(req) {
  return verifyToken(readCookie(req, SESSION_COOKIE));
}

export function sessionCookieValue(token, ttlMs = SESSION_TTL_MS) {
  const secure = !!process.env.VERCEL_URL;
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(ttlMs / 1000)}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function setSessionCookie(res, token, ttlMs = SESSION_TTL_MS) {
  res.setHeader("Set-Cookie", sessionCookieValue(token, ttlMs));
}

export function clearSession(res) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

export function toSession(user) {
  return {
    e: user.email,
    n: user.name || "",
    pr: user.provider || "email",
    uid: user.id || user.email,
  };
}