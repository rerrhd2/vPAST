// ============================================================
// vPast — IconButton
// A small round/square icon button with an accessible label.
// ============================================================

const ICONS_BASE = "/icons";

export function IconButton({ icon, label, onClick, className = "", title }) {
  const btn = document.createElement("button");
  btn.className = `icon-btn ${className}`.trim();
  btn.setAttribute("aria-label", label);
  if (title) btn.title = title;
  btn.type = "button";

  const img = document.createElement("img");
  img.src = `${ICONS_BASE}/${icon}`;
  img.alt = "";
  img.width = 18;
  img.height = 18;

  btn.append(img);
  if (onClick) btn.addEventListener("click", onClick);

  return btn;
}
