// ============================================================
// vPast — uploader
// Asks /api/uploads for the relay URL, then uploads the file
// straight from the browser to the relay with a raw XHR PUT
// (real upload progress in every browser). The relay stores the
// file in a private Telegram channel and returns its file_id.
// Same flow works against serve.ps1 for local development.
// ============================================================

function safeName(name) {
  const cleaned = String(name || "file")
    .replace(/[\\/]/g, "_")
    .replace(/["']/g, "")
    .trim();
  return cleaned ? cleaned.slice(0, 180) : "file";
}

async function requestUploadUrl() {
  const response = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "upload-request" }),
  });

  if (!response.ok) {
    let message = "Could not start upload";
    try {
      const data = await response.json();
      if (data && data.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return response.json();
}

function putFile(uploadUrl, file, method, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, uploadUrl);

    // If the MIME type is non-trivial the browser will send a CORS
    // preflight; the relay answers OPTIONS with the allowed methods.
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded, event.total);
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(makeError("Invalid upload response", xhr.status));
        }
      } else {
        let serverMessage = null;
        try {
          const data = JSON.parse(xhr.responseText);
          if (data && data.error) serverMessage = data.error;
        } catch {
          /* ignore */
        }
        const err = makeError(
          serverMessage || `Upload failed (${xhr.status})`,
          xhr.status
        );
        reject(err);
      }
    });

    xhr.addEventListener("error", () => reject(makeError("Connection error", 0)));
    xhr.addEventListener("abort", () => reject(makeError("Upload aborted", 0)));

    xhr.send(file);
  });
}

function makeError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function sendOnce(uploadUrl, file, onProgress) {
  // POST is the most portable method for public proxies (HF Spaces
  // officially supports GET/POST). PUT is kept as a fallback for
  // relays that only expose /up as PUT.
  try {
    return await putFile(uploadUrl, file, "POST", onProgress);
  } catch (err) {
    if (err.status === 405 || err.status === 501) {
      return putFile(uploadUrl, file, "PUT", onProgress);
    }
    throw err;
  }
}

/**
 * Uploads a File to the relay. Resolves with normalized metadata:
 * { name, size, type, url, downloadUrl, pathname }
 */
export async function uploadFile(file, onProgress) {
  const { uploadUrl } = await requestUploadUrl();

  const query = new URLSearchParams({
    name: file.name,
    type: file.type || "application/octet-stream",
  });
  const target = `${uploadUrl}${uploadUrl.includes("?") ? "&" : "?"}${query.toString()}`;

  const raw = await sendOnce(target, file, onProgress);

  return {
    name: raw.name || file.name,
    size: raw.size || file.size,
    type: raw.contentType || file.type || "application/octet-stream",
    url: raw.url,
    downloadUrl: raw.downloadUrl || raw.url,
    pathname: raw.pathname || raw.url,
  };
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = "B";
  for (const next of units) {
    if (value < 1024) break;
    value /= 1024;
    unit = next;
  }
  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${unit}`;
}

export const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024;