// ============================================================
// vPast — Google Sign-In (OAuth 2.0 authorization-code + PKCE)
// Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
// Redirect URI: {VPAST_ORIGIN}/api/auth/google/callback
// ============================================================

import crypto from "crypto";
import { b64url } from "./session.js";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
export const OAUTH_COOKIE = "vpast_oauth";

export function configured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function makeStateAndVerifier() {
  const state = crypto.randomBytes(16).toString("hex");
  const verifier = b64url(crypto.randomBytes(32));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  return { state, verifier, challenge };
}

export function authUrl({ clientId, redirectUri, state, challenge }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    include_granted_scopes: "true",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeCode({ code, codeVerifier, redirectUri }) {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error("No access token from Google");
  const ures = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  if (!ures.ok) throw new Error(`Google userinfo failed: ${ures.status}`);
  return ures.json();
}