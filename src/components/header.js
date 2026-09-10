// ============================================================
// vPast — Header (brand + language switcher)
// ============================================================

import { getLang, setLang, langCodeName, LANGS, t } from "../i18n.js";
import { AdminMenu, watchAdmin } from "../admin.js";

const ICONS_BASE = "/icons";

function LangSwitch() {
  const group = document.createElement("div");
  group.className = "lang-switch";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Language");

  for (const code of LANGS) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "lang-switch__opt";
    option.textContent = langCodeName(code);
    option.setAttribute("aria-label", code.toUpperCase());
    const active = code === getLang();
    option.classList.toggle("is-active", active);
    option.setAttribute("aria-pressed", active ? "true" : "false");
    option.addEventListener("click", () => setLang(code));
    group.append(option);
  }

  return group;
}

export function Header() {
  const header = document.createElement("header");
  header.className = "header";

  const brand = document.createElement("a");
  brand.className = "brand";
  brand.href = "/";
  brand.setAttribute("aria-label", t("header.home"));

  const logo = document.createElement("img");
  logo.className = "brand__logo";
  logo.src = `${ICONS_BASE}/Logo.png`;
  logo.alt = "";

  const name = document.createElement("span");
  name.className = "brand__name";
  name.textContent = "vPast";

  brand.append(logo, name);

  const right = document.createElement("div");
  right.className = "header__right";

  const langSwitch = LangSwitch();

  const adminSlot = document.createElement("div");
  adminSlot.className = "header__admin-slot";
  let adminMenu = null;
  function applyAdmin(admin) {
    if (admin && !adminMenu) {
      adminMenu = AdminMenu();
      adminSlot.append(adminMenu);
    } else if (!admin && adminMenu) {
      adminMenu.remove();
      adminMenu = null;
    }
  }
  watchAdmin(applyAdmin);

  right.append(adminSlot, langSwitch);

  header.append(brand, right);
  return header;
}