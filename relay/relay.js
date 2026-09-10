// ============================================================
// vPast Relay — runs on a VPS (Oracle Cloud free tier etc.)
//
// Two jobs:
//   1) PUT /up   — receive a file from the browser (up to 2 GB),
//                  upload it to a private Telegram channel via the
//                  LOCAL bot API server (tdlib/telegram-bot-api),
//                  return { name, size, type, url, downloadUrl, pathname }.
//   2) GET /dl   — fetch a file back from Telegram by file_id and
//                  stream it to the client.
//
// Bytes are streamed through this server. Telegram is the durable store.
// No secrets are hardcoded — everything comes from the environment.
// ============================================================

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const { randomUUID } = require("crypto");

const RELAY_PORT = Number(process.env.RELAY_PORT || process.env.PORT || 8787);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TG_LOCAL = process.env.TELEGRAM_LOCAL_API || "http://127.0.0.1:8081";
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(os.tmpdir(), "vpast-uploads");
const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB
// Files are streamed through /dl straight from the tg bot API storage.
const PUBLIC_BASE = process.env.RELAY_PUBLIC_URL || `http://localhost:${RELAY_PORT}`;

if (!BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is not set");
  process.exit(1);
}

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- small helpers ----------

const send = (res, status, data, extraHeaders = {}) => {
  const body = typeof data === "string" ? data : JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    ...extraHeaders,
  });
  res.end(body);
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PUT, GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Content-Length",
  "Access-Control-Max-Age": "86400",
};

const tg = (method, form) =>
  new Promise((resolve) => {
    const args = [`${TG_LOCAL}/bot${BOT_TOKEN}/${method}`];
    const cp = spawn("curl", args.concat(form), { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    cp.stdout.on("data", (d) => (out += d));
    cp.stderr.on("data", (d) => (err += d));
    cp.on("close", (code) => {
      let json = null;
      try {
        json = JSON.parse(out);
      } catch {
        json = null;
      }
      resolve({ json, code, err });
    });
  });

// Send the uploaded file to the private channel via the local API server.
// The local server accepts an absolute path / file:// URI as the field value
// (2 GB limit), so we stream to disk first, then hand the path over.
function uploadToTelegram(filePath, filename, mime) {
  return tg("sendDocument", [
    ["chat_id", TG_CHAT_ID],
    ["document", `file://${filePath}`],
    ["filename", filename],
  ]).then(({ json, code, err }) => {
    if (!json || !json.ok) {
      return { error: `telegram upload failed (${code}): ${(json && json.description) || err}` };
    }
    const doc = json.result.document;
    return { file_id: doc.file_id, size: doc.file_size };
  });
}

// ---------- server ----------

http
  .createServer((req, res) => {
    const url = new URL(req.url, PUBLIC_BASE);
    const { pathname } = url;

    if (req.method === "OPTIONS") {
      res.writeHead(204, corsHeaders);
      return res.end();
    }

    // Health
    if (req.method === "GET" && pathname === "/health") {
      return send(res, 200, { ok: true });
    }

    // ---- Upload: browser -> us -> (local tg api) -> channel ----
    // POST is the portable method for public proxies (HF Spaces
    // officially supports GET/POST); PUT is kept for compatibility.
    if ((req.method === "PUT" || req.method === "POST") && pathname === "/up") {
      let declared = -1;
      try {
        declared = Number(req.headers["content-length"]);
      } catch {
        declared = -1;
      }
      if (!Number.isFinite(declared) || declared < 0) {
        return send(res, 400, { error: "missing content-length" });
      }
      if (declared > MAX_FILE_BYTES) {
        return send(res, 413, { error: "file too large (max 2 GB)" });
      }

      const name = url.searchParams.get("name") || "file";
      const type = url.searchParams.get("type") || "application/octet-stream";
      const safeName = path.basename(name).replace(/[^\w.@+\- ]/g, "_").slice(0, 180);
      const slot = randomUUID();
      const tmpPath = path.join(UPLOAD_DIR, `${slot}.bin`);
      const out = fs.createWriteStream(tmpPath);

      let received = 0;
      let aborted = false;
      const fail = (code, msg) => {
        aborted = true;
        res.destroy();
        fs.unlink(tmpPath, () => {});
        try {
          if (!res.headersSent) send(res, code, { error: msg });
          else res.destroy();
        } catch {}
      };

      req.on("data", (chunk) => {
        received += chunk.length;
        if (received > MAX_FILE_BYTES) {
          fail(413, "file too large (max 2 GB)");
        }
      });

      out.on("error", () => fail(500, "disk write failed"));

      out.on("finish", async () => {
        if (aborted) return;
        if (received === 0) {
          fs.unlink(tmpPath, () => {});
          return send(res, 400, { error: "empty upload" });
        }
        const t = await uploadToTelegram(tmpPath, safeName, type);
        fs.unlink(tmpPath, () => {});
        if (t.error) return send(res, 502, { error: t.error });

        const dl = `${PUBLIC_BASE}/dl?id=${encodeURIComponent(t.file_id)}`;
        return send(res, 200, {
          name: safeName,
          size: t.size || received,
          type,
          url: `${dl}&name=${encodeURIComponent(safeName)}&type=${encodeURIComponent(type)}`,
          downloadUrl: `${dl}&name=${encodeURIComponent(safeName)}&type=${encodeURIComponent(type)}`,
          pathname: t.file_id,
        });
      });

      req.pipe(out);
      return;
    }

    // ---- Download: we -> (local tg api storage) -> client ----
    if (req.method === "GET" && pathname === "/dl") {
      const fileId = url.searchParams.get("id");
      const name = url.searchParams.get("name") || "file";
      const preview = url.searchParams.get("preview") === "1";
      const rawType = url.searchParams.get("type") || "";
      if (!fileId) return send(res, 400, { error: "missing id" });

      tg("getFile", [
        ["file_id", fileId],
        ["info", "true"],
      ])
        .then(async ({ json }) => {
          if (!json || !json.ok || !json.result || !json.result.file_path) {
            return send(res, 404, { error: "file not found" });
          }
          let filePath = json.result.file_path;
          if (!fs.existsSync(filePath)) {
            // Some builds return a relative path inside the storage dir.
            const localApiStorage = json.result.local?.path || "";
            if (localApiStorage && fs.existsSync(localApiStorage)) filePath = localApiStorage;
          }
          fs.stat(filePath, (err, st) => {
            if (err || !st.isFile()) return send(res, 404, { error: "file not found" });
            const headers = {
              "Content-Type": preview
                ? rawType || "application/octet-stream"
                : "application/octet-stream",
              "Content-Length": st.size,
              "Access-Control-Allow-Origin": "*",
            };
            if (preview) {
              headers["Content-Disposition"] = "inline";
            } else {
              headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(name)}`;
            }
            res.writeHead(200, headers);
            fs.createReadStream(filePath).pipe(res);
          });
        })
        .catch(() => send(res, 502, { error: "relay error" }));
      return;
    }

    return send(res, 404, { error: "not found" });
  })
  .listen(RELAY_PORT, () => {
    console.log(`vPast relay listening on :${RELAY_PORT}`);

    // Keep a free HF Space (and similar sleeping hosts) awake:
    // free tiers sleep after 48 h of inactivity, so self-ping every 6 h.
    if (/^https?:\/\//.test(PUBLIC_BASE) && !/localhost|127\.0\.0\.1/.test(PUBLIC_BASE)) {
      setInterval(() => {
        http.get(PUBLIC_BASE + "/health", (r) => r.resume()).on("error", () => {});
      }, 6 * 60 * 60 * 1000);
    }
  });