// ============================================================
// vPast — .docx preview (read-only, Word-like formatting)
// Tiny ZIP reader (stored + deflate via DecompressionStream)
// + DOMParser-driven render of word/document.xml to styled HTML.
// Supports bold/italic/underline/strike, fonts, size, color,
// highlight, alignment, headings, lists, hyperlinks, tables.
// ============================================================

const NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const NS_PKG = "http://schemas.openxmlformats.org/package/2006/relationships";
const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

export function isDocx(file) {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  return type.includes("wordprocessingml") || name.endsWith(".docx");
}

// ---------- ZIP ----------

function decodeZip(buffer) {
  const dv = new DataView(buffer);
  const len = dv.byteLength;
  let eocd = -1;
  for (let i = len - 22; i >= 0; i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a ZIP archive");

  const cdCount = dv.getUint16(eocd + 10, true);
  const cdOffset = dv.getUint32(eocd + 16, true);
  const decoded = new TextDecoder();
  const entries = {};

  let p = cdOffset;
  for (let n = 0; n < cdCount; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const compLen = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const localOffset = dv.getUint32(p + 42, true);
    const nameBytes = new Uint8Array(buffer, p + 46, nameLen);
    entries[decoded.decode(nameBytes).replace(/\\/g, "/")] = { method, compLen, localOffset };
    p += 46 + nameLen + extraLen + commentLen;
  }

  for (const entry of Object.values(entries)) {
    const lp = entry.localOffset;
    if (dv.getUint32(lp, true) !== 0x04034b50) continue;
    const nameLen = dv.getUint16(lp + 26, true);
    const extraLen = dv.getUint16(lp + 28, true);
    const start = lp + 30 + nameLen + extraLen;
    entry.data = new Uint8Array(buffer, start, entry.compLen);
  }

  return {
    async read(name) {
      const entry = entries[name];
      if (!entry) return null;
      if (entry.method === 0) return entry.data;
      if (entry.method === 8) return inflateRaw(entry.data);
      return null;
    },
    has(name) {
      return !!entries[name];
    },
  };
}

async function inflateRaw(data) {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function parseXml(bytes) {
  const text = new TextDecoder().decode(bytes);
  const doc = new DOMParser().parseFromString(text, "text/xml");
  if (doc.getElementsByTagName("parsererror").length) {
    throw new Error("Invalid XML part");
  }
  return doc;
}

// ---------- XML helpers ----------

function w(el, name) {
  return el ? el.getElementsByTagNameNS(NS_W, name)[0] || null : null;
}

function wAll(el, name) {
  return el ? Array.from(el.getElementsByTagNameNS(NS_W, name)) : [];
}

function aVal(el, name, def) {
  if (!el) return def;
  const v = el.getAttribute(name);
  if (v !== null && v !== undefined) return v;
  const nsv = el.getAttributeNS(NS_W, name);
  return nsv !== null && nsv !== undefined ? nsv : def;
}

function isTrue(el, name) {
  if (!el) return false;
  const v = aVal(el, name, "true").toLowerCase();
  return v !== "false" && v !== "0" && v !== "none";
}

function hexColor(value) {
  return /^[0-9a-fA-F]{6}$/.test(value || "") ? "#" + value.toLowerCase() : null;
}

// ---------- Render ----------

function runCss(rPr) {
  const css = {};
  if (isTrue(w(rPr, "b"), "w:val")) css.fontWeight = "bold";
  if (isTrue(w(rPr, "i"), "w:val")) css.fontStyle = "italic";
  const u = w(rPr, "u");
  if (u && isTrue(u, "w:val") && !css.fontStyle) css.textDecoration = "underline";
  else if (u && isTrue(u, "w:val")) {
    css.textDecoration = (css.textDecoration ? css.textDecoration + " " : "") + "underline";
  }
  if (isTrue(w(rPr, "strike"), "w:val")) {
    css.textDecoration = (css.textDecoration ? css.textDecoration + " " : "") + "line-through";
  }
  const rFonts = w(rPr, "rFonts");
  const font = rFonts ? aVal(rFonts, "w:ascii", null) || aVal(rFonts, "w:eastAsia", null) : null;
  if (font) css.fontFamily = String(font).replace(/[\x00-\x1f;"<>&]/g, "").slice(0, 60);
  const sz = w(rPr, "sz");
  const half = sz ? parseInt(aVal(sz, "w:val", ""), 10) : NaN;
  if (Number.isFinite(half) && half > 0) css.fontSize = `${half / 2}pt`;
  const color = hexColor(w(rPr, "color") ? aVal(w(rPr, "color"), "w:val", "") : "");
  if (color) css.color = color;
  const shd = w(rPr, "shd");
  const fill = hexColor(shd ? aVal(shd, "w:fill", "") : "");
  if (fill) css.backgroundColor = fill;
  const va = w(rPr, "vertAlign") ? aVal(w(rPr, "vertAlign"), "w:val", "") : "";
  if (va === "superscript") css.vertAlign = "super";
  if (va === "subscript") css.vertAlign = "sub";
  return css;
}

const SAFE_LINK = /^(https?:\/\/|mailto:|\#|\.\/|\/|\.\.\/)/i;

function applyCss(el, css) {
  const parts = [];
  for (const k of Object.keys(css)) {
    const prop = k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
    parts.push(`${prop}: ${css[k]};`);
  }
  if (parts.length) el.setAttribute("style", parts.join(" "));
}

function renderRun(r, baseCss) {
  const rPr = w(r, "rPr");
  const css = Object.assign({}, baseCss, runCss(rPr));
  const inner = [];

  for (const child of Array.from(r.childNodes)) {
    if (child.nodeType !== 1) continue;
    const local = child.localName;
    if (local === "t") inner.push(document.createTextNode(child.textContent));
    else if (local === "tab") inner.push(document.createTextNode("\t"));
    else if (local === "br") inner.push(document.createElement("br"));
    else if (local === "noBreakHyphen") inner.push(document.createTextNode("\u2011"));
    else if (local === "sym") {
      const char = parseInt(aVal(child, "w:char", ""), 16);
      if (Number.isFinite(char) && char > 0) {
        try {
          inner.push(document.createTextNode(String.fromCodePoint(char)));
        } catch {
          /* ignore */
        }
      }
    }
  }

  let out = inner;
  if (css.vertAlign === "super") {
    const s = document.createElement("sup");
    s.append(...out);
    out = [s];
  } else if (css.vertAlign === "sub") {
    const s = document.createElement("sub");
    s.append(...out);
    out = [s];
  }
  delete css.vertAlign;

  if (inner.some((x) => x.nodeType === 1)) {
    // Keep <br>/whitespace as-is inside a wrapper span.
    const span = document.createElement("span");
    applyCss(span, css);
    span.append(...out);
    return span;
  }

  if (Object.keys(css).length === 0) {
    const span = document.createElement("span");
    span.append(...out);
    return span;
  }

  const span = document.createElement("span");
  applyCss(span, css);
  span.append(...out);
  return span;
}

function renderParagraph(p, ctx) {
  const pPr = w(p, "pPr");

  // numbering / list
  const numPr = pPr ? w(pPr, "numPr") : null;
  let list = null;
  if (numPr) {
    const numId = numPr ? parseInt(aVal(w(numPr, "numId"), "w:val", "0"), 10) || 0 : 0;
    const ilvl = numPr ? parseInt(aVal(w(numPr, "ilvl"), "w:val", "0"), 10) || 0 : 0;
    if (numId) list = { numId, ilvl, ordered: ctx.isOrdered(numId) };
  }

  if (list) {
    const li = document.createElement("li");
    const children = renderParagraphChildren(p, ctx, {});
    li.append(...children);
    return { li, ilvl: list.ilvl, ordered: list.ordered };
  }

  const styleId = pPr && w(pPr, "pStyle") ? aVal(w(pPr, "pStyle"), "w:val", "") : "";
  const level = ctx.headingLevel(styleId);

  let el;
  if (level) {
    el = document.createElement(`h${Math.min(6, level)}`);
  } else {
    el = document.createElement("p");
    const align = pPr && w(pPr, "jc") ? aVal(w(pPr, "jc"), "w:val", "") : "";
    if (align === "center" || align === "right" || align === "justify" || align === "left") {
      el.style.textAlign = align;
    }
    const ind = pPr && w(pPr, "ind") ? w(pPr, "ind") : null;
    if (ind) {
      const left = aVal(ind, "w:left", null) || aVal(ind, "w:start", null);
      const first = aVal(ind, "w:firstLine", null);
      const hanging = aVal(ind, "w:hanging", null);
      const leftPt = left ? `${parseInt(left, 10) || 1}pt` : null;
      if (leftPt) el.style.marginLeft = leftPt;
      if (first && !hanging) el.style.textIndent = `${parseInt(first, 10) || 1}pt`;
      if (hanging && leftPt) el.style.textIndent = `-${hanging && parseInt(hanging, 10) ? Math.min(parseInt(hanging, 10), 9999) : 1}pt`;
    }
    const spacing = pPr && w(pPr, "spacing");
    if (spacing) {
      const before = parseInt(aVal(spacing, "w:before", "0"), 10) || 0;
      const after = parseInt(aVal(spacing, "w:after", "0"), 10) || 0;
      if (before) el.style.marginTop = `${Math.round(before / 20)}pt`;
      if (after) el.style.marginBottom = `${Math.round(after / 20)}pt`;
    }
  }

  const children = renderParagraphChildren(p, ctx, {});
  el.append(...children);
  return { el };
}

function renderParagraphChildren(p, ctx, base) {
  const out = [];
  for (const child of Array.from(p.childNodes)) {
    if (child.nodeType !== 1) continue;
    const local = child.localName;
    if (local === "r") {
      out.push(renderRun(child, base));
    } else if (local === "hyperlink") {
      const href = ctx.resolveHref(child);
      if (href && SAFE_LINK.test(href)) {
        const a = document.createElement("a");
        a.href = href;
        a.rel = "noopener";
        a.target = "_blank";
        for (const rn of Array.from(child.childNodes)) {
          if (rn.nodeType === 1 && rn.localName === "r") a.append(renderRun(rn, base));
        }
        out.push(a);
      } else {
        for (const rn of Array.from(child.childNodes)) {
          if (rn.nodeType === 1 && rn.localName === "r") out.push(renderRun(rn, base));
        }
      }
    } else if (local === "pPr") {
      /* handled */
    } else if (local === "smartTag" || local === "ins") {
      for (const rn of Array.from(child.childNodes)) {
        if (rn.nodeType === 1 && rn.localName === "r") out.push(renderRun(rn, base));
      }
    }
    // drawings/pict/mc:AlternateContent -> skipped (images)
  }
  return out;
}

function renderTable(tbl, ctx) {
  const table = document.createElement("table");
  for (const tr of wAll(tbl, "tr")) {
    const row = document.createElement("tr");
    const isHeader = !!w(tr, "trPr") && !!w(w(tr, "trPr"), "tblHeader");
    for (const tc of wAll(tr, "tc")) {
      const cell = document.createElement(isHeader ? "th" : "td");
      for (const child of Array.from(tc.childNodes)) {
        if (child.nodeType !== 1) continue;
        if (child.localName === "p") {
          const res = renderParagraph(child, ctx);
          if (res.list) cell.append(renderListFromParagraphs([res]));
          else if (res.el) cell.append(res.el);
        } else if (child.localName === "tbl") {
          cell.append(renderTable(child, ctx));
        }
      }
      row.append(cell);
    }
    table.append(row);
  }
  return table;
}

function renderListFromParagraphs(items) {
  const root = document.createElement(items[0].ordered ? "ol" : "ul");
  root.style.paddingLeft = "1.6em";
  const stack = [{ depth: items[0].ilvl, container: root }];
  for (const item of items) {
    let cur = stack[stack.length - 1];
    if (item.ilvl > cur.depth) {
      const lastLi = cur.container.lastElementChild;
      const sub = document.createElement(item.ordered ? "ol" : "ul");
      if (lastLi) lastLi.append(sub);
      else cur.container.append(sub);
      stack.push({ depth: item.ilvl, container: sub });
      cur = stack[stack.length - 1];
    } else {
      while (stack.length > 1 && item.ilvl < stack[stack.length - 1].depth) stack.pop();
      cur = stack[stack.length - 1];
    }
    cur.container.append(item.li);
  }
  return root;
}

// ---------- Document context ----------

function buildContext(docx, documentXml) {
  const rels = new Map();
  const styles = new Map();
  let numberingDocRoot = null;

  async function prepare() {
    const [stylesBytes, numBytes, relsBytes] = await Promise.all([
      docx.read("word/styles.xml"),
      docx.read("word/numbering.xml"),
      docx.read("word/_rels/document.xml.rels"),
    ]);
    if (relsBytes) {
      try {
        const relsDoc = parseXml(relsBytes);
        for (const rel of Array.from(relsDoc.documentElement.children)) {
          const id = rel.getAttribute("Id");
          const target = rel.getAttribute("Target");
          if (id && target) rels.set(id, target);
        }
      } catch {
        /* ignore */
      }
    }
    if (stylesBytes) {
      try {
        const sDoc = parseXml(stylesBytes);
        for (const styleEl of Array.from(sDoc.getElementsByTagNameNS(NS_W, "style"))) {
          const id = aVal(styleEl, "w:styleId", "");
          const nameEl = w(styleEl, "name");
          const name = nameEl ? aVal(nameEl, "w:val", "") : "";
          if (id) styles.set(id, name.toLowerCase());
        }
      } catch {
        /* ignore */
      }
    }
    if (numBytes) {
      const numDoc = parseXml(numBytes);
      numberingDocRoot = numDoc;
    }
  }

  return {
    prepare,
    headingLevel(styleId) {
      const name = styles.get(styleId);
      if (!styleId) return 0;
      const m = /heading\s*([1-6])/.exec(name || "");
      if (m) return parseInt(m[1], 10);
      if ((name || "") === "title") return 1;
      if (/^[1-6]$/.test(styleId)) return parseInt(styleId, 10);
      return 0;
    },
    isOrdered(numId) {
      if (!numberingDocRoot) return true;
      try {
        const num = Array.from(numberingDocRoot.getElementsByTagNameNS(NS_W, "num")).find(
          (n) => parseInt(aVal(n, "w:numId", ""), 10) === numId
        );
        if (!num) return true;
        const abstractId = parseInt(aVal(w(num, "abstractNumId"), "w:val", ""), 10);
        if (Number.isNaN(abstractId)) return true;
        const abst = Array.from(numberingDocRoot.getElementsByTagNameNS(NS_W, "abstractNum")).find(
          (n) => parseInt(aVal(n, "w:abstractNumId", ""), 10) === abstractId
        );
        const lvl = abst ? w(abst, "lvl") : null;
        const fmt = lvl ? aVal(w(lvl, "numFmt"), "w:val", "") : "";
        return fmt !== "bullet" && fmt !== "";
      } catch {
        return true;
      }
    },
    resolveHref(hlink) {
      const rid = hlink.getAttributeNS(NS_REL, "id");
      if (rid) return rels.get(rid) || null;
      const anchor = hlink.getAttributeNS(NS_W, "anchor") || hlink.getAttribute("w:anchor");
      return anchor ? `#${anchor}` : null;
    },
  };
}

export async function renderDocx(arrayBuffer) {
  const docx = decodeZip(arrayBuffer);
  const docXmlBytes = await docx.read("word/document.xml");
  if (!docXmlBytes) throw new Error("No document part");
  const docXml = parseXml(docXmlBytes);
  const body = w(docXml.documentElement, "body");
  if (!body) throw new Error("No document body");

  const ctx = buildContext(docx, docXml);
  await ctx.prepare();

  const container = document.createElement("div");
  container.className = "preview__doc";
  const style = document.createElement("style");
  style.textContent =
    `.vp-doc h1{font-size:1.55em}.vp-doc h2{font-size:1.32em}.vp-doc h3{font-size:1.14em}.vp-doc h4{font-size:1.02em}.vp-doc td,.vp-doc th{border:1px solid #b5b5b5;padding:5px 10px}`;
  container.append(style);

  const docEl = document.createElement("div");
  docEl.className = "vp-doc";

  const listGroup = [];
  const flushList = () => {
    if (!listGroup.length) return;
    let seg = [listGroup[0]];
    for (let i = 1; i < listGroup.length; i++) {
      if (listGroup[i].ordered !== seg[seg.length - 1].ordered) {
        docEl.append(renderListFromParagraphs(seg));
        seg = [];
      }
      seg.push(listGroup[i]);
    }
    docEl.append(renderListFromParagraphs(seg));
    listGroup.length = 0;
  };

  for (const child of Array.from(body.childNodes)) {
    if (child.nodeType !== 1) continue;
    const local = child.localName;
    if (local === "p") {
      const res = renderParagraph(child, ctx);
      if (res.li) {
        listGroup.push(res);
      } else {
        flushList();
        docEl.append(res.el);
      }
    } else if (local === "tbl") {
      flushList();
      docEl.append(renderTable(child, ctx));
    }
  }
  flushList();

  container.append(docEl);
  return container;
}