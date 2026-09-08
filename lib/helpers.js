// ============================================================
// vPast — Vercel serverless helpers
// ============================================================

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export function ok(res, body) {
  json(res, 200, body);
}

export function badRequest(res, message) {
  json(res, 400, { error: message });
}

export function notFound(res, message = "Past not found") {
  json(res, 404, { error: message });
}

export function serverError(res, message = "Internal server error") {
  json(res, 500, { error: message });
}

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}