// ============================================================
// vPast — "My pastes" page (/me)
// Lists the signed-in user's own pastes with visibility toggle,
// delete and a storage-until date. Requires a session.
// ============================================================

import { t, tpl, localeTag } from "../i18n.js";
import { refreshAuth, getAuth, openAuthModal } from "../auth.js";
import { formatBytes } from "../blobUpload.js";

function statusView(message, withSignIn) {
  const page = document.createElement("main");
  page.className = "app__stage viewer page-enter";

  const status = document.createElement("div");
  status.className = "viewer__status";

  const mark = document.createElement("div");
  mark.textContent = "vPast";
  mark.style.cssText =
    'font-family:"Climate Crisis",sans-serif;font-size:20px;color:var(--text-3);margin-bottom:16px;';

  const p = document.createElement("p");
  p.textContent = message;

  status.append(mark, p);

  if (withSignIn) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.textContent = t("auth.signIn");
    btn.style.marginTop = "28px";
    btn.addEventListener("click", openAuthModal);
    status.append(btn);
  } else {
    const back = document.createElement("a");
    back.className = "btn";
    back.href = "/";
    back.textContent = t("btn.create");
    back.style.marginTop = "28px";
    status.append(back);
  }

  page.append(status);
  return page;
}

function fmtDate(ms) {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString(localeTag(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function loadingView() {
  const view = statusView(t("viewer.loading"));
  view.classList.add("is-loading");
  return view;
}

export function MyPastes() {
  const view = loadingView();

  refreshAuth().then(async () => {
    const { user } = getAuth();
    if (!user) {
      view.replaceWith(statusView(t("me.needLogin"), true));
      return;
    }

    let items = [];
    try {
      const res = await fetch("/api/me/pastes", { headers: { Accept: "application/json" } });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error("me/pastes failed");
      items = (data && Array.isArray(data.pastes) && data.pastes) || [];
    } catch {
      view.replaceWith(statusView(t("me.loadError")));
      return;
    }

    const page = document.createElement("main");
    page.className = "app__stage me page-enter";

    const head = document.createElement("div");
    head.className = "me__head";
    const title = document.createElement("h1");
    title.textContent = t("me.title");
    const sub = document.createElement("p");
    sub.textContent = t("me.subtitle");
    head.append(title, sub);

    const list = document.createElement("div");
    list.className = "me__list";

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "me__empty";
      empty.textContent = t("me.empty");
      list.append(empty);
    } else {
      for (const item of items) {
        list.append(pasteCard(item));
      }
    }

    page.append(head, list);
    view.replaceWith(page);
  });

  return view;

  function pasteCard(item) {
    const card = document.createElement("div");
    card.className = "me__card";

    const top = document.createElement("div");
    top.className = "me__card-top";

    const link = document.createElement("a");
    link.className = "me__link";
    link.href = "/p/" + encodeURIComponent(item.id);
    link.textContent = item.id;

    const badge = document.createElement("span");
    badge.className = "me__badge " + (item.visibility === "private" ? "is-private" : "");
    badge.textContent =
      item.visibility === "private" ? t("vis.private") : t("vis.public");
    badge.title = t(item.visibility === "private" ? "vis.privateTip" : "vis.publicTip");

    top.append(link, badge);

    const meta = document.createElement("div");
    meta.className = "me__meta";
    const parts = [];
    parts.push(fmtDate(item.created));
    if (item.hasText) parts.push(t("me.text"));
    if (item.fileCount > 0) parts.push(formatBytes(item.biggest) + " · " + (item.fileCount > 1 ? tpl("me.filesN", { n: String(item.fileCount) }) : t("me.file")));
    parts.push(item.expiresAt ? t("me.until") + " " + fmtDate(item.expiresAt) : t("me.forever"));
    meta.textContent = parts.join(" · ");

    const actions = document.createElement("div");
    actions.className = "me__actions";

    const visBtn = document.createElement("button");
    visBtn.type = "button";
    visBtn.className = "btn btn--ghost btn--sm";
    visBtn.textContent =
      item.visibility === "private" ? t("me.makePublic") : t("me.makePrivate");
    visBtn.addEventListener("click", async () => {
      const next = item.visibility === "private" ? "public" : "private";
      visBtn.disabled = true;
      try {
        const res = await fetch(`/api/me/pastes/${encodeURIComponent(item.id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visibility: next }),
        });
        if (res.ok) {
          item.visibility = next;
          badge.textContent = next === "private" ? t("vis.private") : t("vis.public");
          badge.className = "me__badge " + (next === "private" ? "is-private" : "");
          visBtn.textContent = next === "private" ? t("me.makePublic") : t("me.makePrivate");
        }
      } catch {
        /* ignore */
      }
      visBtn.disabled = false;
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn--danger btn--sm";
    delBtn.textContent = t("me.delete");
    delBtn.addEventListener("click", async () => {
      if (!window.confirm(t("me.confirmDelete"))) return;
      delBtn.disabled = true;
      try {
        const res = await fetch(`/api/me/pastes/${encodeURIComponent(item.id)}`, {
          method: "DELETE",
        });
        if (res.ok) card.remove();
        if (list.children.length === 0) {
          const empty = document.createElement("div");
          empty.className = "me__empty";
          empty.textContent = t("me.empty");
          list.append(empty);
        }
      } catch {
        /* ignore */
      }
      delBtn.disabled = false;
    });

    actions.append(visBtn, delBtn);

    card.append(top, meta, actions);
    return card;
  }
}