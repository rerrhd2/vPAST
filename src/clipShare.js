// ============================================================
// vPast — clipboard / share helpers
// ============================================================

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older / insecure contexts
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "absolute";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      const sel = document.getSelection();
      const prev = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      if (prev) {
        sel.removeAllRanges();
        sel.addRange(prev);
      }
      return true;
    } catch {
      return false;
    }
  }
}

// Prefers native Web Share; falls back to clipboard.
// Resolves to "shared" | "copied" | "failed".
export async function shareOrCopy(url, title = "vPast") {
  const nav = navigator;
  if (nav.share) {
    try {
      await nav.share({ title, url });
      return "shared";
    } catch (err) {
      if (err && err.name === "AbortError") return "cancelled";
      // fall through to clipboard
    }
  }
  const ok = await copyText(url);
  return ok ? "copied" : "failed";
}
