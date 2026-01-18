// src/services/api.js (FULL FILE)

export const API_URL =
  import.meta.env.VITE_API_URL || "https://habeshaweb.onrender.com";

// -------------------------
// Token helpers
// -------------------------
function readToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

function authHeaders() {
  const token = readToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// -------------------------
// Core request helper
// -------------------------
async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(auth ? authHeaders() : {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || `HTTP ${res.status}` };
  }

  if (!res.ok) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }

  return data;
}

// ======================================================
// AUTH
// ======================================================

// Admin login (PUBLIC)
export function loginRequest(email, password) {
  return request("/login", {
    method: "POST",
    auth: false,
    body: { email, password },
  });
}

// Client login (PUBLIC)
export function clientLoginRequest(email, password) {
  return request("/client-login", {
    method: "POST",
    auth: false,
    body: { email, password },
  });
}

// ✅ Client registration (PUBLIC)
// 🔥 THIS IS WHAT AuthContext EXPECTS
export function clientRegister(payload) {
  return request("/client-register", {
    method: "POST",
    auth: false,
    body: payload,
  });
}

// alias (safe to keep)
export const registerClientRequest = clientRegister;

// Get current user (PROTECTED)
export function getMe() {
  return request("/api/me", { method: "GET" });
}

// ======================================================
// ADMIN – CLIENTS
// ======================================================

export function listClients() {
  return request("/api/clients", { method: "GET" });
}

export function createClient(payload) {
  return request("/api/clients", {
    method: "POST",
    body: payload,
  });
}

// ======================================================
// FILE BROWSER
// ======================================================

export function listClientItems(client, path = "") {
  const q = new URLSearchParams();
  if (path) q.set("path", path);

  return request(
    `/api/clients/${encodeURIComponent(client)}/files?${q.toString()}`,
    { method: "GET" }
  );
}

export function createFolder(client, path = "", name) {
  const q = new URLSearchParams();
  if (path) q.set("path", path);

  return request(
    `/api/clients/${encodeURIComponent(client)}/mkdir?${q.toString()}`,
    {
      method: "POST",
      body: { name },
    }
  );
}

export function createTextFile(client, path = "", fileName, text) {
  const q = new URLSearchParams();
  if (path) q.set("path", path);

  return request(
    `/api/clients/${encodeURIComponent(client)}/writeText?${q.toString()}`,
    {
      method: "POST",
      body: { fileName, text },
    }
  );
}

export function uploadBase64(client, path = "", fileName, base64, contentType = "") {
  const q = new URLSearchParams();
  if (path) q.set("path", path);

  return request(
    `/api/clients/${encodeURIComponent(client)}/uploadBase64?${q.toString()}`,
    {
      method: "POST",
      body: { fileName, base64, contentType },
    }
  );
}

export async function downloadFile(client, path = "", file) {
  const q = new URLSearchParams();
  if (path) q.set("path", path);
  q.set("file", file);

  const res = await fetch(
    `${API_URL}/api/clients/${encodeURIComponent(client)}/download?${q.toString()}`,
    {
      headers: authHeaders(),
    }
  );

  if (!res.ok) throw new Error("Download failed");

  return await res.blob();
}

// ======================================================
// TRASH
// ======================================================

export function trashItem(client, path = "", name) {
  const q = new URLSearchParams();
  if (path) q.set("path", path);

  return request(
    `/api/clients/${encodeURIComponent(client)}/trash?${q.toString()}`,
    {
      method: "POST",
      body: { name },
    }
  );
}

export function restoreItem(client, path = "", name) {
  const q = new URLSearchParams();
  if (path) q.set("path", path);

  return request(
    `/api/clients/${encodeURIComponent(client)}/restore?${q.toString()}`,
    {
      method: "POST",
      body: { name },
    }
  );
}

export function emptyTrash(client, path = "") {
  const q = new URLSearchParams();
  if (path) q.set("path", path);

  return request(
    `/api/clients/${encodeURIComponent(client)}/trash?${q.toString()}`,
    {
      method: "DELETE",
    }
  );
}

export function deleteTrashItem(client, path = "", name) {
  const q = new URLSearchParams();
  if (path) q.set("path", path);
  q.set("name", name);

  return request(
    `/api/clients/${encodeURIComponent(client)}/trashItem?${q.toString()}`,
    {
      method: "DELETE",
    }
  );
}
