// ============================================================
// vPast — DynamicIsland
// The signature floating link element that expands to reveal
// the freshly created past URL, with Share and Close controls.
// ============================================================

import { IconButton } from "./iconButton.js";
import { shareOrCopy } from "../clipShare.js";

const ICONS_BASE = "/icons";

export function DynamicIsland({ url, onClose }) {
  const wrap = document.createElement("div");
  wrap.className = "island-wrap";

  const island = document.createElement("div");
  island.className = "island";
  island.setAttribute("role", "status");
  island.setAttribute("aria-live", "polite");

  const content = document.createElement("div");
  content.className = "island__content";

  // link
  const link = document.createElement("a");
  link.className = "island__link";
  link.href = url;
  link.setAttribute("aria-label", `Open past at ${url}`);

  const dot = document.createElement("span");
  dot.className = "island__dot";
  dot.setAttribute("aria-hidden", "true");

  const urlText = document.createElement("span");
  urlText.className = "island__url";
  const bare = url.replace(/^https?:\/\//, "");
  urlText.textContent = bare;

  link.append(dot, urlText);

  // actions
  const actions = document.createElement("div");
  actions.className = "island__actions";

  const shareBtn = IconButton({
    icon: "share.png",
    label: "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443",
    title: "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c",
    onClick: async (e) => {
      e.stopPropagation();
      const result = await shareOrCopy(url);
      if (result === "copied") {
        shareBtn.classList.add("is-copied");
        shareBtn.setAttribute("aria-label", "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u043e!");
        shareBtn.title = "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u043d\u043e";
        setTimeout(() => {
          shareBtn.classList.remove("is-copied");
          shareBtn.setAttribute("aria-label", "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c \u0441\u0441\u044b\u043b\u043a\u0443");
          shareBtn.title = "\u0421\u043a\u043e\u043f\u0438\u0440\u043e\u0432\u0430\u0442\u044c";
        }, 1500);
      }
    },
  });

  const closeBtn = IconButton({
    icon: "close.png",
    label: "\u0417\u0430\u043a\u0440\u044b\u0442\u044c",
    title: "\u0417\u0430\u043a\u0440\u044b\u0442\u044c",
    onClick: () => {
      island.classList.remove("is-open");
      island.classList.remove("is-visible");
      setTimeout(() => {
        wrap.remove();
        if (onClose) onClose();
      }, 240);
    },
  });

  actions.append(shareBtn, closeBtn);
  content.append(link, actions);
  island.append(content);
  wrap.append(island);

  // animation sequence: appear narrow, then open
  requestAnimationFrame(() => {
    island.classList.add("is-visible");
    requestAnimationFrame(() => {
      island.classList.add("is-open");
    });
  });

  return wrap;
}
