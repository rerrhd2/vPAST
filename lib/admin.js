// ============================================================
// vPast — admin guard (cookie-based)
// A request is admin-flagged when the vpastadmin=admin cookie is
// present. The cookie is set OUTSIDE this app (e.g. by a browser
// extension) — the app never writes it itself.
// ============================================================

const ADMIN_COOKIE_NAME = "vpastadmin";
const ADMIN_COOKIE_VALUE = "admin";

export function isAdminReq(req) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === ADMIN_COOKIE_NAME) {
      if (part.slice(eq + 1).trim() === ADMIN_COOKIE_VALUE) return true;
    }
  }
  return false;
}