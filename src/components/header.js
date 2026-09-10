// ============================================================
// vPast — Header (brand + language + auth/account + admin)
// ============================================================

import { getLang, setLang, langCodeName, LANGS, t } from "../i18n.js";
import { AdminMenu } from "../admin.js";
import { refreshAuth, getAuth, logout, openAuthModal } from "../auth.js";

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

function AccountChip() {
  const wrap = document.createElement("div");
  wrap.className = "account";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "account__btn";
  button.setAttribute("aria-haspopup", "true");
  button.setAttribute("aria-expanded", "false");

  const avatar = document.createElement("span");
  avatar.className = "account__avatar";
  const menu = document.createElement("span");
  menu.className = "account__menu-label";

  function render() {
    const { user } = getAuth();
    const name = (user && user.name) || (user && (user.email || "").split("@")[0]) || "";
    avatar.textContent = (name[0] || "?").toUpperCase();
    menu.textContent = name.slice(0, 18);
    button.title = user ? user.email : "";
  }
  render();

  const popover = document.createElement("div");
  popover.className = "account__popover";
  popover.hidden = true;

  const emailLine = document.createElement("div");
  emailLine.className = "account__email";
  const myPastes = document.createElement("a");
  myPastes.className = "account__item";
  myPastes.href = "/me";
  myPastes.textContent = t("auth.myPastes");
  const signOut = document.createElement("button");
  signOut.type = "button";
  signOut.className = "account__item account__item--danger";
  signOut.textContent = t("auth.signOut");
  signOut.addEventListener("click", logout);

  popover.append(emailLine, myPastes, signOut);

  button.append(avatar, menu);
  button.addEventListener("click", () => {
    const opening = popover.hidden;
    popover.hidden = !opening;
    button.setAttribute("aria-expanded", opening ? "true" : "false");
    if (opening) emailLine.textContent = getAuth().user?.email || "";
  });
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target) && !popover.hidden) {
      popover.hidden = true;
      button.setAttribute("aria-expanded", "false");
    }
  });

  wrap.append(button, popover);
  return wrap;
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

  const signInBtn = document.createElement("button");
  signInBtn.type = "button";
  signInBtn.className = "btn btn--ghost btn--sm";
  signInBtn.textContent = t("auth.signIn");
  signInBtn.addEventListener("click", openAuthModal);

  const adminSlot = document.createElement("div");
  adminSlot.className = "header__admin-slot";
  let adminMenu = null;
  let account = null;

  refreshAuth().then(() => {
    const { user, isAdmin } = getAuth();
    if (user && !account) {
      account = AccountChip();
      right.insertBefore(account, langSwitch);
    }
    if (isAdmin && !adminMenu) {
      adminMenu = AdminMenu();
      right.insertBefore(adminMenu, langSwitch);
    }
    if (!user && !account) {
      right.insertBefore(signInBtn, langSwitch);
    }
  });

  const langSwitch = LangSwitch();

  right.append(adminSlot, langSwitch);
  header.append(brand, right);
  return header;
}