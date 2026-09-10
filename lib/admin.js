// ============================================================
// vPast — admin guard (session-based)
// A request is admin when a valid vpast_session cookie exists
// AND the session email is in the VPAST_ADMIN_EMAILS allowlist
// (comma-separated). For local serve.ps1 an empty allowlist
// means "every signed-in user is an admin" (dev convenience only).
// ============================================================

import { getSession } from "./session.js";

export function adminEmails() {
  return (process.env.VPAST_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminReq(req) {
  const session = getSession(req);
  if (!session || !session.e) return false;
  const list = adminEmails();
  if (list.length === 0) {
    // no allowlist configured — treat dev environments as "everyone admin".
    return !!process.env.NODE_ENV?.startsWith("dev") || !!process.env.VPAST_DEV;
  }
  return list.includes(String(session.e).toLowerCase());
}

export function sessionUser(req) {
  return getSession(req);
}