// src/services/api.js

const API_URL =
  (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "") ||
  "https://habeshaweb.onrender.com"; // fallback for production

function clearToken() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
}

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");

  const headers = {
    ...(options.headers || {}),
  };

  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (e) {
    // network/CORS/URL issue
    throw new Error("Failed to fetch");
  }

  // ✅ If token expired / missing
  if (res.status === 401) {
    clearToken();

    // Optional hard redirect so the app stops making more calls
    // (works even if some component is still mounted)
    if (typeof window !== "undefined") {
      const isOnLogin = window.location.pathname.startsWith("/login");
      if (!isOnLogin) window.location.href = "/login";
    }

    throw new Error("Unauthorized");
  }

  // Blob support
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

/* AUTH */
export async function loginRequest(email, password) {
  return apiFetch("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe() {
  return apiFetch("/api/me", { method: "GET" });
}

/* CLIENTS */
export async function listClients() {
  return apiFetch("/api/clients", { method: "GET" });
}

export async function createClient(payload) {
  return apiFetch("/api/clients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* FILE BROWSER */
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
// ✅ Soft delete (move to Trash)
// ✅ backend route: POST /api/clients/:client/trash?file=...&path=...
export async function trashFile(client, path = "", fileName) {
  const qs = `?file=${encodeURIComponent(fileName)}${
    path ? `&path=${encodeURIComponent(path)}` : ""
  }`;

  return apiFetch(`/api/clients/${encodeURIComponent(client)}/trash${qs}`, {
    method: "POST",
  });
}
export async function downloadFile(client, path = "", fileName) {
  const qs = `?file=${encodeURIComponent(fileName)}${path ? `&path=${encodeURIComponent(path)}` : ""}`;
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/download${qs}`, {
    method: "GET",
    expectBlob: true,
  });
}

/* ALIASES */
export async function listClientFiles(client, path = "") {
  return listClientItems(client, path);
}

export async function uploadClientFileBase64(client, path = "", fileName, base64, contentType = "") {
  return uploadBase64(client, path, fileName, base64, contentType);
}

export async function deleteClientFile(client, path = "", fileName) {
  return deleteFile(client, path, fileName);
}

export async function getDownloadUrl(client, path = "", fileName) {
  const blob = await downloadFile(client, path, fileName);
  return URL.createObjectURL(blob);
}
