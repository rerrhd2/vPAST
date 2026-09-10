// ============================================================
// vPast — admin gate + admin menu
// The admin cookie (name=vpastadmin, value=admin) is set EXTERNALLY
// (e.g. by a browser extension). This app never writes it.
// When present: the header shows an Admin menu with stats,
// delete-by-id and a full clear (all cookie/API gated too).
// ============================================================

import { t, tpl } from "./i18n.js";
import { formatBytes } from "./blobUpload.js";

const ADMIN_COOKIE = "vpastadmin=admin";

export function isAdmin() {
  for (const part of document.cookie.split(";")) {
    if (part.trim() === ADMIN_COOKIE) return true;
  }
  return false;
}

// ---- lightweight cookie watcher (extension sets the cookie after load) ----
const observers = new Set();
let pollTimer = null;

export function watchAdmin(onChange) {
  observers.add(onChange);
  onChange(isAdmin());
  if (!pollTimer) {
    pollTimer = setInterval(() => {
      for (const fn of [...observers]) fn(isAdmin());
    }, 1200);
  }
  return function stopWatch() {
    observers.delete(onChange);
    if (observers.size === 0 && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };
}

async function adminApi(path, options) {
  const res = await fetch(path, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }
  return { status: res.status, data };
}

function statLine(label, value) {
  const row = document.createElement("div");
  row.className = "admin__stat";
  const k = document.createElement("span");
  k.textContent = label;
  const v = document.createElement("span");
  v.className = "admin__stat-value";
  v.textContent = value;
  row.append(k, v);
  return row;
}

export function AdminMenu() {
  const root = document.createElement("div");
  root.className = "admin";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "admin__btn";
  btn.setAttribute("aria-haspopup", "true");
  btn.setAttribute("aria-expanded", "false");
  btn.textContent = t("admin.title");

  const panel = document.createElement("div");
  panel.className = "admin__panel";
  panel.hidden = true;
  panel.setAttribute("role", "menu");

  // ---- stats ----
  const statsHead = document.createElement("h4");
  statsHead.className = "admin__head";
  statsHead.textContent = t("admin.stats");

  const stats = document.createElement("div");
  stats.className = "admin__stats";
  const statsLoad = document.createElement("div");
  statsLoad.className = "admin__muted";
  statsLoad.textContent = t("viewer.loading");
  stats.append(statsLoad);

  function refreshStats() {
    stats.replaceChildren();
    const loading = document.createElement("div");
    loading.className = "admin__muted";
    loading.textContent = t("viewer.loading");
    stats.append(loading);
    adminApi("/api/admin/stats")
      .then(({ status, data }) => {
        stats.replaceChildren();
        if (status !== 200 || !data || typeof data.pastes !== "number") {
          const err = document.createElement("div");
          err.className = "admin__error";
          err.textContent =
            status === 403 ? t("admin.denied") : tpl("admin.error", { msg: t("viewer.loadError") });
          stats.append(err);
          return;
        }
        stats.append(
          statLine(t("admin.pastes"), String(data.pastes)),
          statLine(t("admin.files"), String(data.files)),
          statLine(t("admin.bytes"), formatBytes(data.bytes))
        );
      })
      .catch(() => {
        stats.replaceChildren();
        const err = document.createElement("div");
        err.className = "admin__error";
        err.textContent = tpl("admin.error", { msg: "network" });
        stats.append(err);
      });
  }

  // ---- delete by id ----
  const delHead = document.createElement("h4");
  delHead.className = "admin__head";
  delHead.textContent = t("admin.deleteLabel");

  const delRow = document.createElement("div");
  delRow.className = "admin__row";
  const delInput = document.createElement("input");
  delInput.type = "text";
  delInput.className = "admin__input";
  delInput.placeholder = t("admin.deletePlaceholder");
  delInput.setAttribute("spellcheck", "false");
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "btn btn--danger";
  delBtn.textContent = t("admin.deleteBtn");
  delRow.append(delInput, delBtn);

  const delMsg = document.createElement("div");
  delMsg.className = "admin__msg";

  delBtn.addEventListener("click", async () => {
    const id = delInput.value.trim();
    if (!id) return;
    const { status, data } = await adminApi("/api/admin/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    delMsg.textContent =
      status === 200
        ? tpl("admin.deleted", { n: String((data && data.removed) || 0) })
        : status === 403
          ? t("admin.denied")
          : t((data && data.error) || "err.create");
    if (status === 200) {
      delInput.value = "";
      refreshStats();
    }
  });

  // ---- danger: clear all ----
  const clearHead = document.createElement("h4");
  clearHead.className = "admin__head";
  clearHead.textContent = t("admin.clearLabel");

  const clearRow = document.createElement("div");
  clearRow.className = "admin__row";
  const clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "btn btn--danger";
  clearBtn.textContent = t("admin.clearBtn");
  clearRow.append(clearBtn);

  const clearMsg = document.createElement("div");
  clearMsg.className = "admin__msg";

  clearBtn.addEventListener("click", async () => {
    if (!window.confirm(t("admin.confirmClear"))) return;
    const { status, data } = await adminApi("/api/admin/clear", { method: "POST" });
    clearMsg.textContent =
      status === 200
        ? tpl("admin.deleted", { n: String((data && data.removed) || 0) })
        : status === 403
          ? t("admin.denied")
          : t("err.create");
    if (status === 200) refreshStats();
  });

  panel.append(
    statsHead,
    stats,
    delHead,
    delRow,
    delMsg,
    clearHead,
    clearRow,
    clearMsg
  );

  btn.addEventListener("click", () => {
    const opening = panel.hidden;
    panel.hidden = !opening;
    btn.setAttribute("aria-expanded", opening ? "true" : "false");
    if (opening) refreshStats();
  });

  document.addEventListener("click", (e) => {
    if (!root.contains(e.target) && !panel.hidden) {
      panel.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    }
  });

  root.append(btn, panel);
  return root;
}