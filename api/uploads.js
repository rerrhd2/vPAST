// ============================================================
// vPast — POST /api/uploads
// Returns the upload URL of the vPast relay (VPS). The browser
// uploads the file DIRECTLY to the relay (up to 2 GB), so bytes
// never pass through this Vercel function (4.5 MB body limit).
// The relay stores the file in a private Telegram channel.
//
// Physical upload location comes from the RELAY_UPLOAD_URL env
// variable — this file contains no secrets.
// ============================================================

import { ok, json } from "../lib/helpers.js";

const RELAY_UPLOAD_URL = process.env.RELAY_UPLOAD_URL || "";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  if (!RELAY_UPLOAD_URL) {
    console.error("RELAY_UPLOAD_URL is not set");
    return json(res, 500, { error: "Upload not configured" });
  }

  return ok(res, {
    clientToken: null,
    uploadUrl: RELAY_UPLOAD_URL,
  });
}