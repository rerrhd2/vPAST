// ============================================================
// vPast — JSON helpers
// Lightweight JS/json highlighting (VS Code-ish dark palette)
// + auto-format (pretty-print).
// ============================================================

export function isJsonText(text) {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  const first = trimmed.charCodeAt(0);
  return first === 0x7b || first === 0x5b; // { or [
}

export function formatJson(text) {
  try {
    const value = JSON.parse(text);
    return JSON.stringify(value, null, 2);
  } catch {
    return null;
  }
}

function esc(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const TOKEN =
  /("(?:[^"\\]|\\.)*")(\s*:)?|(true|false|null)\b|(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|([{}\[\],:])/g;

/**
 * Returns HTML (escaped) with token spans: strings, keys, numbers,
 * literals, punctuation. Tolerant of invalid JSON while typing.
 */
export function highlightJson(text) {
  const out = [];
  let last = 0;
  TOKEN.lastIndex = 0;
  let m;
  while ((m = TOKEN.exec(text))) {
    if (m.index > last) out.push(esc(text.slice(last, m.index)));
    if (m[1] !== undefined) {
      if (m[2] !== undefined) {
        out.push(`<span class="tok-key">${esc(m[1])}</span>`);
        out.push(`<span class="tok-punc">${esc(m[2])}</span>`);
      } else {
        out.push(`<span class="tok-str">${esc(m[1])}</span>`);
      }
    } else if (m[3] !== undefined) {
      out.push(`<span class="tok-lit">${esc(m[0])}</span>`);
    } else if (m[4] !== undefined) {
      out.push(`<span class="tok-num">${esc(m[0])}</span>`);
    } else if (m[5] !== undefined) {
      out.push(`<span class="tok-punc">${esc(m[0])}</span>`);
    }
    last = TOKEN.lastIndex;
  }
  if (last < text.length) out.push(esc(text.slice(last)));
  return out.join("");
}