// ============================================================
// vPast — Header (brand)
// ============================================================

const ICONS_BASE = "/icons";

export function Header() {
  const header = document.createElement("header");
  header.className = "header";

  const brand = document.createElement("a");
  brand.className = "brand";
  brand.href = "/";
  brand.setAttribute("aria-label", "vPast home");

  const logo = document.createElement("img");
  logo.className = "brand__logo";
  logo.src = `${ICONS_BASE}/Logo.png`;
  logo.alt = "";

  const name = document.createElement("span");
  name.className = "brand__name";
  name.textContent = "vPast";

  brand.append(logo, name);

  const spacer = document.createElement("span");
  spacer.className = "header__spacer";
  spacer.setAttribute("aria-hidden", "true");

  header.append(brand, spacer);
  return header;
}