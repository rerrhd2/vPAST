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

function putFile(uploadUrl, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);

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
          reject(new Error("Invalid upload response"));
        }
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Connection error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.send(file);
  });
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

  const raw = await putFile(target, file, onProgress);

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