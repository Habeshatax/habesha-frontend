// src/services/api.js

const API = import.meta.env.VITE_API_URL;

// ---------- token helpers ----------
function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

// ---------- generic JSON helper ----------
export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

// ---------- auth ----------
export async function loginRequest(email, password) {
  return apiFetch("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe() {
  return apiFetch("/api/me", { method: "GET" });
}

// ---------- clients ----------
export async function listClients() {
  return apiFetch("/api/clients", { method: "GET" });
}

export async function createClient(payloadOrName) {
  const payload =
    typeof payloadOrName === "string"
      ? { name: payloadOrName }
      : payloadOrName;

  return apiFetch("/api/clients", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ---------- file browser ----------
export async function listClientItems(client, path = "") {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/files${qs}`, {
    method: "GET",
  });
}

// Upload base64 (optionally pass contentType)
export async function uploadBase64(client, path = "", fileName, base64, contentType = "") {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(
    `/api/clients/${encodeURIComponent(client)}/uploadBase64${qs}`,
    {
      method: "POST",
      body: JSON.stringify({ fileName, base64, contentType }),
    }
  );
}

export async function deleteFile(client, path = "", fileName) {
  const qs =
    `?file=${encodeURIComponent(fileName)}` +
    (path ? `&path=${encodeURIComponent(path)}` : "");

  return apiFetch(`/api/clients/${encodeURIComponent(client)}/file${qs}`, {
    method: "DELETE",
  });
}

/**
 * Download with Authorization header
 */
export async function downloadFile(client, path = "", fileName) {
  const qs =
    `?file=${encodeURIComponent(fileName)}` +
    (path ? `&path=${encodeURIComponent(path)}` : "");

  const token = getToken();
  const res = await fetch(
    `${API}/api/clients/${encodeURIComponent(client)}/download${qs}`,
    {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.blob();
}

// ---------- NEW: create folder ----------
export async function createFolder(client, path = "", folderName) {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/mkdir${qs}`, {
    method: "POST",
    body: JSON.stringify({ name: folderName }),
  });
}

// ---------- NEW: create text file ----------
export async function createTextFile(client, path = "", fileName, text) {
  const qs = path ? `?path=${encodeURIComponent(path)}` : "";
  return apiFetch(`/api/clients/${encodeURIComponent(client)}/writeText${qs}`, {
    method: "POST",
    body: JSON.stringify({
      fileName,
      text,
      contentType: "text/plain",
    }),
  });
}
