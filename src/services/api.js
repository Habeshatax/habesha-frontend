// src/services/api.js

const API_URL =
  (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "") || "http://localhost:8787";

// --------------------------
// Basic fetch wrapper
// --------------------------
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  const headers = {
    ...(options.headers || {}),
  };

  // If body is a string, assume JSON unless caller set a content-type
  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  // Auth header
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  // Blob response support (downloads)
  if (options.expectBlob) {
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `Request failed (${res.status})`);
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

// ✅ Fix for Render build: Dashboard imports listClients
export async function listClients() {
  return apiFetch("/api/clients", { method: "GET" });
}

// Create client folder + structure
// payload: { name, businessType, services: [] }
export async function createClient(payload) {
  return apiFetch("/api/clients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* --------------------------
   FILE BROWSER
-------------------------- */

// List files/folders under client + path
export async function listClientItems(client, path = "") {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/files${qs}`, {
    method: "GET",
  });
}

// Upload as base64
// body: { fileName, base64, contentType? }
export async function uploadBase64(client, path = "", fileName, base64, contentType = "") {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/uploadBase64${qs}`, {
    method: "POST",
    body: JSON.stringify({ fileName, base64, contentType }),
  });
}

// Create a folder
// ✅ backend expects body: { name }
export async function createFolder(client, path = "", name) {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/mkdir${qs}`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

// Create a text file
// ✅ backend route: POST /api/clients/:client/writeText
// ✅ body: { fileName, text }
export async function createTextFile(client, path = "", fileName, text) {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/writeText${qs}`, {
    method: "POST",
    body: JSON.stringify({ fileName, text }),
  });
}

// Delete a file
// ✅ backend route: DELETE /api/clients/:client/file?file=...&path=...
export async function deleteFile(client, path = "", fileName) {
  const qs = `?file=${encodeURIComponent(fileName)}${
    path ? `&path=${encodeURIComponent(path)}` : ""
  }`;

  return apiFetch(`/api/clients/${encodeURIComponent(client)}/file${qs}`, {
    method: "DELETE",
  });
}

// Download a file (returns Blob)
// ✅ backend route: GET /api/clients/:client/download?file=...&path=...
export async function downloadFile(client, path = "", fileName) {
  const qs = `?file=${encodeURIComponent(fileName)}${
    path ? `&path=${encodeURIComponent(path)}` : ""
  }`;

  return apiFetch(`/api/clients/${encodeURIComponent(client)}/download${qs}`, {
    method: "GET",
    expectBlob: true,
  });
}

/* --------------------------
   Backwards-compatible aliases (old names used in some pages)
-------------------------- */

// listClientFiles -> listClientItems
export async function listClientFiles(client, path = "") {
  return listClientItems(client, path);
}

// uploadClientFileBase64 -> uploadBase64
export async function uploadClientFileBase64(client, path = "", fileName, base64, contentType = "") {
  return uploadBase64(client, path, fileName, base64, contentType);
}

// deleteClientFile -> deleteFile
export async function deleteClientFile(client, path = "", fileName) {
  return deleteFile(client, path, fileName);
}

// getDownloadUrl: convert blob to blob URL
export async function getDownloadUrl(client, path = "", fileName) {
  const blob = await downloadFile(client, path, fileName);
  return URL.createObjectURL(blob);
}
