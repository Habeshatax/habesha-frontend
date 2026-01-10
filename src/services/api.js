// src/services/api.js

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// Basic fetch wrapper
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  const headers = {
    ...(options.headers || {}),
  };

  // JSON body handling
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

  // If downloading a file, caller may want blob
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
   FILE BROWSER
-------------------------- */

// List files/folders under client + path
export async function listClientItems(client, path = "") {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/files${qs}`, {
    method: "GET",
  });
}

// Upload as base64 (expects base64 DATA URL string)
export async function uploadBase64(client, path = "", fileName, base64) {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/uploadBase64${qs}`, {
    method: "POST",
    body: JSON.stringify({ fileName, base64 }),
  });
}

// Create a folder
export async function createFolder(client, path = "", folderName) {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/mkdir${qs}`, {
    method: "POST",
    body: JSON.stringify({ folderName }),
  });
}

// Create a text file
export async function createTextFile(client, path = "", fileName, content) {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/createText${qs}`, {
    method: "POST",
    body: JSON.stringify({ fileName, content }),
  });
}

// Delete a file
export async function deleteFile(client, path = "", fileName) {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/delete${qs}`, {
    method: "POST",
    body: JSON.stringify({ fileName }),
  });
}

// Download a file (returns Blob)
export async function downloadFile(client, path = "", fileName) {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/download${qs}`, {
    method: "POST",
    body: JSON.stringify({ fileName }),
    expectBlob: true,
  });
}
// --------------------------
// Backwards-compatible aliases (old names used in some pages)
// --------------------------

// listClientFiles -> listClientItems
export async function listClientFiles(client, path = "") {
  return listClientItems(client, path);
}

// uploadClientFileBase64 -> uploadBase64
export async function uploadClientFileBase64(client, path = "", fileName, base64) {
  return uploadBase64(client, path, fileName, base64);
}

// deleteClientFile -> deleteFile
export async function deleteClientFile(client, path = "", fileName) {
  return deleteFile(client, path, fileName);
}

// getDownloadUrl (your current API returns blob, not a URL)
// We'll return a blob URL that the UI can use like a "download link"
export async function getDownloadUrl(client, path = "", fileName) {
  const blob = await downloadFile(client, path, fileName);
  return URL.createObjectURL(blob);
}
