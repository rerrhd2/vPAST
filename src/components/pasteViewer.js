// ============================================================
// vPast — Paste viewer page
// Loads a saved past by id from the server API at /p/:id.
// Renders text and/or attached file cards with a click-to-preview
// modal (image / pdf / plain text / fallback).
// ============================================================

import { getPaste } from "../store.js";
import { copyText } from "../clipShare.js";
import { formatBytes } from "../blobUpload.js";
import { isJsonText, highlightJson } from "../jsonHighlight.js";
import { isDocx, renderDocx } from "../docxRender.js";
import { t, localeTag } from "../i18n.js";

const TEXT_EXTS = new Set([
  "txt", "md", "markdown", "json", "csv", "xml", "log", "yaml", "yml",
  "ini", "conf", "cfg", "sh", "bash", "py", "js", "mjs", "cjs", "ts",
  "jsx", "tsx", "css", "scss", "html", "htm", "sql", "java", "c", "h",
  "cpp", "hpp", "cs", "go", "rb", "php", "rs", "swift", "kt", "lua", "r",
]);
const TEXT_PREVIEW_MAX = 1024 * 1024;

function statusView(message, actionText) {
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

  const back = document.createElement("a");
  back.className = "btn";
  back.href = "/";
  back.textContent = actionText || t("btn.create");
  back.style.marginTop = "28px";

  status.append(mark, p, back);
  page.append(status);
  return page;
}

function previewUrlOf(file) {
  const u = file && file.url;
  if (!u) return "";
  return u.includes("/dl?") ? `${u}&preview=1` : u;
}

function isTextPreviewable(file) {
  const name = file.name || "";
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  const type = (file.type || "").toLowerCase();
  return (
    type.startsWith("text/") ||
    type === "application/json" ||
    TEXT_EXTS.has(ext)
  );
}

function noPreviewBlock() {
  const block = document.createElement("div");
  block.className = "preview__none";
  const icon = document.createElement("img");
  icon.src = new URL("/icons/file.png", window.location.href).href;
  icon.alt = "";
  icon.className = "preview__none-icon";
  const label = document.createElement("p");
  label.textContent = t("viewer.noPreview");
  block.append(icon, label);
  return block;
}

function renderDocxPreview(pv, body) {
  const loading = document.createElement("div");
  loading.className = "preview__loading";
  loading.textContent = t("viewer.loading");
  body.append(loading);

  fetch(pv)
    .then((r) => {
      if (!r.ok) throw new Error("docx fetch failed");
      return r.arrayBuffer();
    })
    .then((buffer) => {
      const container = document.createElement("div");
      container.className = "preview__doc-wrap";
      return renderDocx(arrayBufferFrom(buffer)).then((doc) => {
        container.append(doc);
        body.replaceChildren(container);
      });
    })
    .catch(() => body.replaceChildren(noPreviewBlock()));
}

function arrayBufferFrom(buffer) {
  return buffer instanceof ArrayBuffer
    ? buffer
    : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function openPreview(file) {
  const overlay = document.createElement("div");
  overlay.className = "preview";
  overlay.setAttribute("role", "presentation");

  const dialog = document.createElement("div");
  dialog.className = "preview__dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", file.name);

  const head = document.createElement("div");
  head.className = "preview__head";

  const name = document.createElement("div");
  name.className = "preview__name";
  name.textContent = file.name;

  const close = document.createElement("button");
  close.type = "button";
  close.className = "preview__close";
  close.textContent = "\u00d7";
  close.setAttribute("aria-label", t("viewer.close"));
  close.title = t("viewer.close");

  head.append(name, close);

  const body = document.createElement("div");
  body.className = "preview__body";

  const foot = document.createElement("div");
  foot.className = "preview__foot";

  const dl = document.createElement("a");
  dl.className = "btn";
  dl.href = file.downloadUrl || file.url;
  dl.download = file.name;
  dl.rel = "noopener";
  dl.target = "_blank";
  dl.textContent = t("viewer.download");
  foot.append(dl);

  dialog.append(head, body, foot);
  overlay.append(dialog);
  document.body.append(overlay);

  function dismiss() {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (e.key === "Escape") dismiss();
  }

  close.addEventListener("click", dismiss);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) dismiss();
  });
  document.addEventListener("keydown", onKey);
  close.focus();

  const pv = previewUrlOf(file);
  const type = (file.type || "").toLowerCase();

  if (type.startsWith("image/") && pv) {
    const img = document.createElement("img");
    img.className = "preview__image";
    img.alt = file.name;
    img.addEventListener("load", () => body.replaceChildren(img));
    img.addEventListener("error", () => body.replaceChildren(noPreviewBlock()));
    img.src = pv;
  } else if (type === "application/pdf" && pv) {
    const frame = document.createElement("iframe");
    frame.className = "preview__iframe";
    frame.title = file.name;
    frame.src = pv;
    body.append(frame);
  } else if (isDocx(file) && pv) {
    renderDocxPreview(pv, body);
  } else if (isTextPreviewable(file) && file.size <= TEXT_PREVIEW_MAX) {
    const loading = document.createElement("div");
    loading.className = "preview__loading";
    loading.textContent = t("viewer.loading");
    body.append(loading);
    fetch(pv)
      .then((r) => (r.ok ? r.text() : null))
      .then((text) => {
        if (text === null) {
          body.replaceChildren(noPreviewBlock());
          return;
        }
        const pre = document.createElement("pre");
        pre.className = "preview__text";
        if (isJsonText(text)) {
          pre.innerHTML = highlightJson(text);
        } else {
          pre.textContent = text;
        }
        body.replaceChildren(pre);
      })
      .catch(() => body.replaceChildren(noPreviewBlock()));
  } else {
    body.append(noPreviewBlock());
  }
}

function fileCard(file) {
  const card = document.createElement("div");
  card.className = "viewer__file";
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", t("viewer.preview"));

  const badge = document.createElement("div");
  badge.className = "viewer__file-badge";
  const ext = file.name.includes(".")
    ? file.name.split(".").pop().slice(0, 5).toUpperCase()
    : "FILE";
  badge.textContent = ext;

  const info = document.createElement("div");
  info.className = "viewer__file-info";

  const fname = document.createElement("div");
  fname.className = "viewer__file-name";
  fname.textContent = file.name;

  const fmeta = document.createElement("div");
  fmeta.className = "viewer__file-meta";
  fmeta.textContent = `${formatBytes(file.size)}${file.type ? " \u00b7 " + file.type : ""}`;

  const actions = document.createElement("div");
  actions.className = "viewer__file-actions";

  const previewBtn = document.createElement("button");
  previewBtn.type = "button";
  previewBtn.className = "btn";
  previewBtn.textContent = t("viewer.preview");

  const dl = document.createElement("a");
  dl.className = "btn";
  dl.href = file.downloadUrl || file.url;
  dl.download = file.name;
  dl.rel = "noopener";
  dl.target = "_blank";
  dl.textContent = t("viewer.download");

  actions.append(previewBtn, dl);

  info.append(fname, fmeta);
  card.append(badge, info, actions);
  card.addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    openPreview(file);
  });
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPreview(file);
    }
  });
  return card;
}

export function PasteViewer({ id }) {
  // Loading placeholder — the API round-trip happens below.
  const loading = statusView(t("viewer.loading"));
  loading.classList.add("is-loading");

  getPaste(id)
    .then((entry) => {
      if (entry === null) {
        loading.replaceWith(statusView(t("viewer.notFound")));
        return;
      }
      if (entry.private) {
        loading.replaceWith(statusView(t("viewer.private")));
        return;
      }

      const page = document.createElement("main");
      page.className = "app__stage viewer page-enter";

      const paper = document.createElement("div");
      paper.className = "viewer__paper";

      if (entry.visibility === "private") {
        const badge = document.createElement("div");
        badge.className = "viewer__vis-badge";
        badge.textContent = t("vis.private");
        paper.append(badge);
      }

      if (entry.text) {
        let text;
        if (isJsonText(entry.text)) {
          text = document.createElement("pre");
          text.className = "viewer__text is-json";
          text.innerHTML = highlightJson(entry.text);
        } else {
          text = document.createElement("div");
          text.className = "viewer__text";
          text.textContent = entry.text;
        }
        paper.append(text);
      }

      const files = Array.isArray(entry.files) ? entry.files : [];
      if (files.length) {
        for (const file of files) {
          if (file && file.name) paper.append(fileCard(file));
        }
      } else if (entry.file) {
        paper.append(fileCard(entry.file));
      }

      // Footer row: date + copy (text only)
      const row = document.createElement("div");
      row.className = "viewer__copy-row";

      const meta = document.createElement("span");
      meta.className = "viewer__meta";
      const when = new Date(entry.created);
      meta.textContent =
        t("viewer.created") +
        " " +
        when.toLocaleDateString(localeTag(), {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

      row.append(meta);

      if (entry.text) {
        const copyBtn = document.createElement("button");
        copyBtn.className = "btn";
        copyBtn.type = "button";
        copyBtn.textContent = t("viewer.copy");
        copyBtn.addEventListener("click", async () => {
          const ok = await copyText(entry.text);
          if (ok) {
            copyBtn.textContent = t("viewer.copied");
            setTimeout(() => (copyBtn.textContent = t("viewer.copy")), 1500);
          }
        });
        row.append(copyBtn);
      }

      paper.append(row);
      page.append(paper);

      loading.replaceWith(page);
    })
    .catch((err) => {
      console.error(err);
      loading.replaceWith(statusView(t("viewer.loadError")));
    });

  return loading;
}