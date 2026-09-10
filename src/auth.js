// ============================================================
// vPast — auth store + Auth modal (Sign in with Google / email).
// Session lives in a server HttpOnly cookie (vpast_session).
// /api/auth/me tells us who we are; that's the only source of
// truth the UI uses.
// ============================================================

import { t, tpl } from "./i18n.js";

let cache = null;
let inflight = null;

export function getAuth() {
  return cache || { user: null, isAdmin: false };
}

export async function refreshAuth(force = false) {
  if (cache && !force) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch("/api/auth/me", { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("auth/me failed");
      const data = await res.json();
      cache = {
        user: data && data.user ? data.user : null,
        isAdmin: !!(data && data.isAdmin),
      };
    } catch {
      cache = { user: null, isAdmin: false };
    } finally {
      inflight = null;
    }
    return cache;
  })();
  return inflight;
}

export async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    /* ignore */
  }
  cache = { user: null, isAdmin: false };
  window.location.href = "/";
}

export function openAuthModal() {
  AuthModal();
}

// ============================================================
// Modal
// ============================================================

const GOOGLE_ICON = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 32.8 29.1 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.1 0-9.6-3.2-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C36.9 40.6 44 36 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>`;

function backdrop() {
  let el = document.getElementById("auth-modal");
  if (el) {
    // reset to the default form on each open
    el.querySelectorAll(".auth-sent").forEach((n) => n.remove());
    const emailForm = el.querySelector(".auth-email");
    const or = el.querySelector(".auth-or");
    const msg = el.querySelector(".auth-msg");
    if (emailForm) emailForm.hidden = false;
    if (or) or.hidden = false;
    if (msg) msg.textContent = "";
    el.hidden = false;
    return el;
  }
  el = document.createElement("div");
  el.id = "auth-modal";
  el.className = "auth-overlay";
  el.hidden = false;
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-label", t("auth.title"));

  const card = document.createElement("div");
  card.className = "auth-card";

  const head = document.createElement("div");
  head.className = "auth-card__head";
  const title = document.createElement("h3");
  title.textContent = t("auth.title");
  const sub = document.createElement("p");
  sub.textContent = t("auth.subtitle");
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "auth-card__close";
  closeBtn.setAttribute("aria-label", t("island.close"));
  closeBtn.textContent = "\u00d7";
  closeBtn.addEventListener("click", close);
  head.append(title, sub, closeBtn);

  // Google
  const googleBtn = document.createElement("button");
  googleBtn.type = "button";
  googleBtn.className = "auth-google";
  googleBtn.innerHTML = `${GOOGLE_ICON}<span>${t("auth.google")}</span>`;
  googleBtn.addEventListener("click", async () => {
    googleBtn.disabled = true;
    try {
      const res = await fetch("/api/auth/google/start", { credentials: "same-origin" });
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.url) {
        window.location.href = data.url;
      } else {
        msgEl.textContent = t("auth.googleUnavailable");
        googleBtn.disabled = false;
      }
    } catch {
      msgEl.textContent = t("auth.network");
      googleBtn.disabled = false;
    }
  });

  const or = document.createElement("div");
  or.className = "auth-or";
  or.textContent = t("auth.or");

  // Email method
  const emailForm = document.createElement("form");
  emailForm.className = "auth-email";
  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.required = true;
  emailInput.placeholder = t("auth.emailPlaceholder");
  emailInput.autocomplete = "email";
  const sendBtn = document.createElement("button");
  sendBtn.type = "submit";
  sendBtn.className = "btn";
  sendBtn.textContent = t("auth.sendLink");
  emailForm.append(emailInput, sendBtn);

  const msgEl = document.createElement("p");
  msgEl.className = "auth-msg";
  msgEl.setAttribute("role", "status");

  let okPanel = null;

  function showSent(email) {
    const sent = document.createElement("div");
    sent.className = "auth-sent";
    const icon = document.createElement("div");
    icon.className = "auth-sent__icon";
    icon.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4Z"/></svg>`;
    const h = document.createElement("p");
    h.className = "auth-sent__title";
    h.textContent = tpl("auth.sentTitle", { email });
    const hint = document.createElement("p");
    hint.textContent = t("auth.sentHint");
    sent.append(icon, h, hint);

    // code fallback
    const codeForm = document.createElement("form");
    codeForm.className = "auth-email";
    const codeInput = document.createElement("input");
    codeInput.type = "text";
    codeInput.placeholder = t("auth.codePlaceholder");
    codeInput.spellcheck = false;
    const codeBtn = document.createElement("button");
    codeBtn.type = "submit";
    codeBtn.className = "btn";
    codeBtn.textContent = t("auth.continue");
    codeForm.append(codeInput, codeBtn);
    codeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      codeBtn.disabled = true;
      msgEl.textContent = "";
      try {
        const res = await fetch("/api/auth/email/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: codeInput.value.trim() }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok) {
          window.location.href = "/me";
          return;
        }
        msgEl.textContent = (data && data.error) || t("auth.codeBad");
        codeBtn.disabled = false;
      } catch {
        msgEl.textContent = t("auth.network");
        codeBtn.disabled = false;
      }
    });
    sent.append(codeForm);
    return sent;
  }

  emailForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    if (!email) return;
    sendBtn.disabled = true;
    msgEl.textContent = "";
    try {
      const res = await fetch("/api/auth/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        okPanel = showSent(email);
        card.append(okPanel);
        emailForm.hidden = true;
        or.hidden = true;
        return;
      }
      msgEl.textContent = (data && data.error) || t("auth.network");
      sendBtn.disabled = false;
    } catch {
      msgEl.textContent = t("auth.network");
      sendBtn.disabled = false;
    }
  });

  card.append(head, googleBtn, or, emailForm, msgEl);

  function close() {
    el.hidden = true;
  }
  el.addEventListener("click", (e) => {
    if (e.target === el) close();
  });
  document.addEventListener("keydown", onKey);
  function onKey(e) {
    if (e.key === "Escape") close();
  }

  el.append(card);
  document.body.append(el);
  return el;
}

function AuthModal() {
  backdrop();
}