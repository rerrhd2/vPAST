// ============================================================
// vPast — Paste viewer page
// Loads a saved past by id from the server API at /p/:id
// ============================================================

import { getPaste } from "../store.js";
import { copyText } from "../clipShare.js";

function statusView(message, actionText = "\u0421\u043e\u0437\u0434\u0430\u0442\u044c Past") {
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
  back.textContent = actionText;
  back.style.marginTop = "28px";

  status.append(mark, p, back);
  page.append(status);
  return page;
}

export function PasteViewer({ id }) {
  // Loading placeholder — the API round-trip happens below.
  const loading = statusView("\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430...");
  loading.classList.add("is-loading");

  getPaste(id)
    .then((entry) => {
      if (entry === null) {
        loading.replaceWith(
          statusView("\u042d\u0442\u043e\u0442 Past \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d \u0438\u043b\u0438 \u0431\u044b\u043b \u0443\u0434\u0430\u043b\u0435\u043d.")
        );
        return;
      }

      const page = document.createElement("main");
      page.className = "app__stage viewer page-enter";

      const paper = document.createElement("div");
      paper.className = "viewer__paper";

      const text = document.createElement("div");
      text.className = "viewer__text";
      text.textContent = entry.text;
      paper.append(text);

      // Copy row
      const row = document.createElement("div");
      row.className = "viewer__copy-row";

      const meta = document.createElement("span");
      meta.className = "viewer__meta";
      const when = new Date(entry.created);
      meta.textContent = "\u0421\u043e\u0437\u0434\u0430\u043d\u043e " + when.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      const copyBtn = document.createElement("button");
      copyBtn.className = "btn";
      copyBtn.type = "button";
      copyBtn.textContent = "\u041a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0442\u0435\u043a\u0441\u0442";
      copyBtn.addEventListener("click", async () => {
        const ok = await copyText(entry.text);
        if (ok) {
          copyBtn.textContent = "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u043e";
          setTimeout(() => (copyBtn.textContent = "\u041a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0442\u0435\u043a\u0441\u0442"), 1500);
        }
      });

      row.append(meta, copyBtn);
      paper.append(row);
      page.append(paper);

      loading.replaceWith(page);
    })
    .catch((err) => {
      console.error(err);
      loading.replaceWith(
        statusView("\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c Past.")
      );
    });

  return loading;
}