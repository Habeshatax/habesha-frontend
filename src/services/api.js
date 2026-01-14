// src/services/api.js (FULL FILE)

const RAW = (import.meta.env.VITE_API_URL || "").trim();

// In production, never default to localhost.
// In dev, localhost is fine.
const API_URL = (RAW ||
  (import.meta.env.DEV ? "http://localhost:8787" : "https://habeshaweb.onrender.com")
).replace(/\/+$/, "");

console.log("API_URL =", API_URL);

// --------------------------
// Basic fetch wrapper
// --------------------------
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  const headers = {
    ...(options.headers || {}),
  };

  // If body is a JSON string, set content-type automatically
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // ✅ Blob support (for downloads)
  if (options.expectBlob) {
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Request failed (${res.status})`);
    }
    return res.blob();
  }

  const text = await res.text().catch(() => "");
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || text || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

/* --------------------------
   AUTH
-------------------------- */

export async function loginRequest(email, password) {
  return apiFetch("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe() {
  return apiFetch("/api/me", { method: "GET" });
}

/* --------------------------
   CLIENTS
-------------------------- */

export async function listClients() {
  return apiFetch("/api/clients", { method: "GET" });
}

export async function createClient(payload) {
  return apiFetch("/api/clients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* --------------------------
   FILE BROWSER
-------------------------- */

export async function listClientItems(client, path = "") {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/files${qs}`, {
    method: "GET",
  });
}

export async function uploadBase64(client, path = "", fileName, base64, contentType = "") {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/uploadBase64${qs}`, {
    method: "POST",
    body: JSON.stringify({ fileName, base64, contentType }),
  });
}

export async function createFolder(client, path = "", name) {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/mkdir${qs}`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function createTextFile(client, path = "", fileName, text) {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/writeText${qs}`, {
    method: "POST",
    body: JSON.stringify({ fileName, text }),
  });
}

export async function deleteFile(client, path = "", fileName) {
  const qs = `?file=${encodeURIComponent(fileName)}${path ? `&path=${encodeURIComponent(path)}` : ""}`;
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/file${qs}`, {
    method: "DELETE",
  });
}

// ✅ Download as BLOB (works with your ServiceFileBrowser download code)
export async function downloadFile(client, path = "", fileName) {
  const qs = `?file=${encodeURIComponent(fileName)}${path ? `&path=${encodeURIComponent(path)}` : ""}`;
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/download${qs}`, {
    method: "GET",
    expectBlob: true,
  });
}

// ✅ Trash (soft delete)
// POST /api/clients/:client/trash?path=...
// body: { name }
export async function trashItem(client, path = "", name) {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";

  return apiFetch(`/api/clients/${encodeURIComponent(client)}/trash${qs}`, {
    method: "POST",
    body: JSON.stringify({ name: String(name || "").trim() }),
  });
}

/**
 * ♻️ Restore from Trash (FILES + FOLDERS)
 * POST /api/clients/:client/restore?path=...&name=...
 *
 * path = original folder relative path (same one you used when trashing)
 * name = the item name as it exists in Trash (could include __timestamp if it collided)
 */
export async function restoreFromTrash(client, path = "", name) {
  const qs = `?name=${encodeURIComponent(String(name || "").trim())}${
    path ? `&path=${encodeURIComponent(path)}` : ""
  }`;

  return apiFetch(`/api/clients/${encodeURIComponent(client)}/restore${qs}`, {
    method: "POST",
  });
}
