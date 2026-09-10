// ============================================================
// vPast — Home page
// The editor + file attach (multiple files) + New Past button +
// Dynamic Island.
// ============================================================

import { createPaste } from "../store.js";
import { DynamicIsland } from "./dynamicIsland.js";
import {
  uploadFile,
  formatBytes,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
} from "../blobUpload.js";
import { isJsonText, formatJson, highlightJson } from "../jsonHighlight.js";
import { t, tpl } from "../i18n.js";

const MAX_TEXT_BYTES = 4 * 1024 * 1024;

export function HomePage() {
  const form = document.createElement("form");
  form.className = "app__stage home page-enter";
  form.action = "#";

  // ---- intro ----
  const intro = document.createElement("div");
  intro.className = "home__intro";

  const title = document.createElement("h1");
  title.className = "home__title";
  title.textContent = t("home.title");

  const subtitle = document.createElement("p");
  subtitle.className = "home__subtitle";
  subtitle.textContent = t("home.subtitle");

  intro.append(title, subtitle);

  // ---- editor ----
  const editor = document.createElement("section");
  editor.className = "editor";

  const box = document.createElement("div");
  box.className = "editor__box";

  const hl = document.createElement("pre");
  hl.className = "editor__highlight";
  hl.setAttribute("aria-hidden", "true");

  const field = document.createElement("textarea");
  field.className = "editor__field";
  field.placeholder = t("editor.placeholder");
  field.setAttribute("aria-label", t("editor.aria"));
  field.setAttribute("aria-describedby", "editor-hint");

  field.addEventListener("focus", () => box.classList.add("is-focused"));
  field.addEventListener("blur", () => box.classList.remove("is-focused"));

  box.append(hl, field);

  // ---- JSON: live highlight overlay + sync scrolling ----
  function syncHighlight() {
    const jsonMode = isJsonText(field.value);
    field.classList.toggle("json-mode", jsonMode);
    hl.classList.toggle("is-visible", jsonMode);
    if (jsonMode) {
      hl.innerHTML = highlightJson(field.value);
      hl.style.transform = `translate(${-field.scrollLeft}px, ${-field.scrollTop}px)`;
    }
  }

  function syncScroll() {
    hl.style.transform = `translate(${-field.scrollLeft}px, ${-field.scrollTop}px)`;
  }

  let hlRaf = 0;
  field.addEventListener("input", () => {
    if (hlRaf) cancelAnimationFrame(hlRaf);
    hlRaf = requestAnimationFrame(syncHighlight);
  });
  field.addEventListener("scroll", syncScroll);

  const error = document.createElement("p");
  error.className = "editor__error";
  error.id = "editor-error";
  error.setAttribute("role", "alert");

  const hint = document.createElement("p");
  hint.className = "editor__hint";
  hint.id = "editor-hint";
  hint.textContent = t("editor.hint");

  // ---- file row (multi-file) ----
  let selectedFiles = [];

  const fileRow = document.createElement("div");
  fileRow.className = "file-row";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = true;
  fileInput.className = "visually-hidden";
  fileInput.setAttribute("aria-label", t("file.attach"));

  const attachLabel = document.createElement("label");
  attachLabel.className = "btn btn--ghost";
  attachLabel.appendChild(fileInput);
  const attachText = document.createElement("span");
  attachText.textContent = t("file.attach");
  attachLabel.appendChild(attachText);

  const formatBtn = document.createElement("button");
  formatBtn.type = "button";
  formatBtn.className = "btn btn--ghost btn--format";
  formatBtn.textContent = t("json.format");
  formatBtn.title = t("json.formatTip");
  formatBtn.hidden = true;
  formatBtn.addEventListener("click", () => {
    const formatted = formatJson(field.value);
    if (formatted === null) {
      error.textContent = t("json.notJson");
      return;
    }
    error.textContent = "";
    field.value = formatted;
    syncHighlight();
  });

  const isJsonFile = (file) => {
    const name = (file.name || "").toLowerCase();
    const type = (file.type || "").toLowerCase();
    return name.endsWith(".json") || type === "application/json";
  };

  const fileList = document.createElement("div");
  fileList.className = "file-list";

  function createChip(file) {
    const chip = document.createElement("div");
    chip.className = "file-chip";

    const icon = document.createElement("img");
    icon.className = "file-chip__icon";
    icon.src = new URL("/icons/file.png", window.location.href).href;
    icon.alt = "";

    const name = document.createElement("span");
    name.className = "file-chip__name";
    name.textContent = file.name;

    const meta = document.createElement("span");
    meta.className = "file-chip__meta";
    meta.textContent = formatBytes(file.size);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "file-chip__remove";
    remove.textContent = "\u00d7";
    remove.setAttribute("aria-label", t("file.remove"));
    remove.title = t("file.remove");
    remove.addEventListener("click", () => {
      const i = selectedFiles.indexOf(file);
      if (i >= 0) selectedFiles.splice(i, 1);
      renderFiles();
    });

    chip.append(icon, name, meta, remove);
    return chip;
  }

  function renderFiles() {
    fileList.replaceChildren();
    for (const file of selectedFiles) {
      fileList.append(createChip(file));
    }
    attachText.textContent = t("file.attach");
    formatBtn.hidden = !selectedFiles.some(isJsonFile);
  }

  function addFiles(items) {
    const incoming = Array.from(items);
    if (incoming.length === 0) return;
    for (const file of incoming) {
      if (file.size > MAX_FILE_BYTES) {
        error.textContent = t("file.tooLarge");
        return;
      }
    }
    const total =
      selectedFiles.reduce((sum, f) => sum + f.size, 0) +
      incoming.reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      error.textContent = t("file.totalTooLarge");
      return;
    }
    error.textContent = "";
    selectedFiles.push(...incoming);
    renderFiles();
  }

  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files.length) {
      addFiles(fileInput.files);
      fileInput.value = "";
    }
  });

  // ---- drag & drop ----
  let dragDepth = 0;
  const hasFiles = (e) =>
    e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files");

  function flyToChip(x, y, done) {
    const fly = document.createElement("div");
    fly.className = "file-fly";
    const img = document.createElement("img");
    img.src = new URL("/icons/file.png", window.location.href).href;
    img.alt = "";
    fly.append(img);
    document.body.append(fly);
    fly.style.left = `${x}px`;
    fly.style.top = `${y}px`;

    const rect = (fileList.children.length ? fileList : attachLabel).getBoundingClientRect();
    const dx = rect.left + rect.width / 2 - x;
    const dy = rect.top + rect.height / 2 - y;

    const anim = fly.animate(
      [
        { transform: "translate(-50%, -50%) scale(1)", opacity: 0.95 },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.25)`,
          opacity: 0,
        },
      ],
      { duration: 420, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" }
    );
    anim.onfinish = () => {
      fly.remove();
      if (done) done();
    };
  }

  editor.addEventListener("dragenter", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth++;
    editor.classList.add("is-dragging");
  });

  editor.addEventListener("dragover", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
  });

  editor.addEventListener("dragleave", (e) => {
    if (!hasFiles(e)) return;
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) editor.classList.remove("is-dragging");
  });

  editor.addEventListener("drop", (e) => {
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || files.length === 0) return;
    e.preventDefault();
    dragDepth = 0;
    editor.classList.remove("is-dragging");
    flyToChip(e.clientX, e.clientY, () => addFiles(files));
  });

  fileRow.append(attachLabel, formatBtn, fileList);

  const footer = document.createElement("div");
  footer.className = "home__footer";

  const button = document.createElement("button");
  button.className = "btn";
  button.type = "submit";
  button.textContent = t("btn.new");

  footer.append(button);

  editor.append(box, error, hint, fileRow, footer);

  // ---- submit handler ----
  let busy = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    const text = field.value.trim();

    if (!text && selectedFiles.length === 0) {
      error.textContent = t("err.empty");
      field.focus();
      return;
    }
    if (text && new TextEncoder().encode(text).length > MAX_TEXT_BYTES) {
      error.textContent = t("err.tooLarge");
      field.focus();
      return;
    }
    error.textContent = "";

    busy = true;
    setLoading(true);

    try {
      const uploaded = [];
      if (selectedFiles.length) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const current = selectedFiles[i];
          const label = (pct) =>
            updateLoadingLabel(
              tpl("file.uploadingMany", {
                i: i + 1,
                n: selectedFiles.length,
                pct,
              })
            );
          const file = await uploadFile(current, (loaded, total) => {
            const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
            label(pct);
          });
          uploaded.push(file);
        }
        updateLoadingLabel(t("btn.creating"));
      }

      const result = await createPaste({ content: text, files: uploaded });

      field.value = "";
      selectedFiles = [];
      renderFiles();

      setLoading(false);
      busy = false;

      const island = DynamicIsland({ url: result.url, onClose: null });
      form.insertBefore(island, form.firstChild);
      island.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (err) {
      console.error(err);
      setLoading(false);
      busy = false;
      const uploadFailed = selectedFiles.length > 0;
      const detail = err && err.message ? String(err.message) : "";
      if (uploadFailed) {
        error.textContent = detail || t("file.uploadError");
      } else {
        error.textContent = t("err.create");
      }
      error.title = detail || "";
      if (!selectedFiles.length) field.focus();
    }
  });

  function updateLoadingLabel(text) {
    const label = button.querySelector(".btn__label");
    if (label) label.textContent = text;
  }

  function setLoading(loading) {
    if (loading) {
      button.disabled = true;
      button.replaceChildren();
      const spinner = document.createElement("span");
      spinner.className = "btn__spinner";
      spinner.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.className = "btn__label";
      label.textContent = t("btn.creating");
      button.append(spinner, label);
    } else {
      button.disabled = false;
      button.replaceChildren();
      button.textContent = t("btn.new");
    }
  }

  form.append(intro, editor);
  return form;
}