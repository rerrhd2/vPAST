// ============================================================
// vPast — Router
// Tiny hash-free client-side router using history API with
// SPA fallback (server rewrites unknown paths to /).
// Handles "/" and "/p/:id".
// ============================================================

import { Header } from "./components/header.js";
import { HomePage } from "./components/homePage.js";
import { PasteViewer } from "./components/pasteViewer.js";

function parsePath(path) {
  const clean = path.replace(/\/+$/, "") || "/";
  const m = clean.match(/^\/p\/([^/]+)$/);
  if (m) return { name: "paste", id: m[1] };
  if (clean === "/") return { name: "home" };
  return { name: "home" };
}

export function renderRoute() {
  const app = document.getElementById("app");
  if (!app) return;
  app.replaceChildren();

  const { name, id } = parsePath(window.location.pathname);

  const header = Header();

  let page;
  if (name === "paste") {
    page = PasteViewer({ id });
  } else {
    page = HomePage();
  }

  app.append(header, page);
}

export function initRouter() {
  const onNav = () => renderRoute();
  window.addEventListener("popstate", onNav);
  window.addEventListener("langchange", onLangChange);
  renderRoute();
}

function onLangChange() {
  const prev = document.querySelector(".editor__field");
  const value = prev ? prev.value : null;
  renderRoute();
  if (value !== null && !prev.disabled) {
    const field = document.querySelector(".editor__field");
    if (field) field.value = value;
  }
}
