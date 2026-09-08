// ============================================================
// vPast — data layer
// Primary: sends real HTTP requests to the Vercel serverless
// API (POST /api/pastes, GET /api/pastes/:id). Text is stored
// in PostgreSQL on the server, so pastes survive server
// restarts and are readable from any device.
//
// Fallback: only activates when the API is detected to be
// absent (e.g. static-only hosting like GitHub Pages). The
// /api/health probe decides once at startup, with a lazy
// re-check on 404/non-JSON API responses, so the demo still
// works on static hosts.
// ============================================================

const STORAGE_KEY = "vpast.store.v1";
let apiMode = true; // optimistic; corrected after the probe

export async function probeApi() {
  try {
    const response = await fetch("/api/health", { method: "GET" });
    if (!response.ok || !isJsonResponse(response)) {
      apiMode = false;
    } else {
      const data = await response.json().catch(() => ({}));
      apiMode = data.db === "ok";
    }
  } catch {
    apiMode = false;
  }
  return apiMode;
}

export function isApiMode() {
  return apiMode;
}

function isJsonResponse(response) {
  const type = (response.headers.get("content-type") || "").toLowerCase();
  return type.includes("application/json");
}

async function parseJson(response) {
  return response.json().catch(() => null);
}

// if the API answers with plain HTML (not JSON), it simply
// isn't there -> switch to local mode permanently and retry once.
// A JSON 404 from a real API is NOT treated as "no API".
async function fallbackIfNoApi(response, localFn) {
  if (!response.ok && !isJsonResponse(response)) {
    apiMode = false;
    return localFn();
  }
  return undefined;
}

export async function createPaste(text) {
  if (!apiMode) return createPasteLocal(text);

  const response = await fetch("/api/pastes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text }),
  });

  const local = await fallbackIfNoApi(response, () => createPasteLocal(text));
  if (local) return local;

  if (!response.ok) {
    const data = await parseJson(response);
    throw new Error((data && data.error) || "Could not create Past");
  }

  const data = await response.json();
  return { id: data.id, url: data.url, path: `/p/${data.id}` };
}

export async function getPaste(id) {
  if (!apiMode) return getPasteLocal(id);

  const response = await fetch(`/api/pastes/${encodeURIComponent(id)}`, {
    headers: { Accept: "application/json" },
  });

  if (response.status === 404 && isJsonResponse(response)) {
    // server says "not found" -> real 404, stay in API mode
    return null;
  }

  const local = await fallbackIfNoApi(response, () => getPasteLocal(id));
  if (local !== undefined) return local;

  if (!response.ok) {
    const data = await parseJson(response);
    throw new Error((data && data.error) || "Could not load Past");
  }

  const data = await response.json();
  return { id: data.id, text: data.content, created: data.created };
}

// ============================================================
// Local fallback (static-only hosting, e.g. GitHub Pages)
// ============================================================

function loadLocal() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function persistLocal(store) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

function makeIdLocal(length = 6) {
  const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let id = "";
  const bytes = new Uint8Array(length);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < length; i++) bytes[i] = Math.floor(Math.random() * 256);
  for (let i = 0; i < length; i++) id += ALPHABET[bytes[i] % ALPHABET.length];
  return id;
}

function shortOrigin() {
  const a = document.createElement("a");
  a.href = "/";
  return a.href.replace(/\/$/, "");
}

function createPasteLocal(text) {
  const id = makeIdLocal();
  const store = loadLocal();
  store[id] = { text, created: Date.now() };
  persistLocal(store);
  return { id, url: `${shortOrigin()}/p/${id}`, path: `/p/${id}` };
}

function getPasteLocal(id) {
  const store = loadLocal();
  const entry = store[id];
  if (!entry) return null;
  return { id, text: entry.text, created: entry.created };
}