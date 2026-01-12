// src/components/ServiceFileBrowser.jsx (FULL FILE)

import { useEffect, useMemo, useState } from "react";
import {
  listClientItems,
  uploadBase64,
  downloadFile,
  createFolder,
  createTextFile,
  trashFile,
} from "../services/api";


function normalize(p) {
  return String(p || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

function joinPath(a, b) {
  const A = normalize(a);
  const B = normalize(b);
  if (!A) return B || "";
  if (!B) return A || "";
  return `${A}/${B}`;
}

function isInside(base, candidate) {
  const b = normalize(base);
  const c = normalize(candidate);
  if (!b) return true;
  return c === b || c.startsWith(b + "/");
}

export default function ServiceFileBrowser({ client, basePath, permissions }) {
  const base = useMemo(() => normalize(basePath), [basePath]);

  // ✅ default permissions (full access)
  const perms = useMemo(
    () =>
      permissions || {
        canUpload: true,
        canDelete: true,
        canMkdir: true,
        canWriteText: true,
      },
    [permissions]
  );

  const [path, setPath] = useState(base);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [newFolderName, setNewFolderName] = useState("");
  const [newNoteName, setNewNoteName] = useState("");
  const [newNoteText, setNewNoteText] = useState("");

  useEffect(() => {
    setPath(base);
    setItems([]);
    setMsg("");
    setErr("");
  }, [client, base]);

  const crumbs = useMemo(() => {
    const clean = normalize(path);
    if (!clean) return [];
    return clean.split("/");
  }, [path]);

  const atTabRoot = useMemo(() => normalize(path) === normalize(base), [path, base]);

  async function refresh(forPath = path) {
    if (!client) return;
    setLoading(true);
    setErr("");
    setMsg("");
    try {
      const data = await listClientItems(client, forPath);
      const arr = data.items || [];

      arr.sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return String(a.name).localeCompare(String(b.name));
      });

      setItems(arr);
    } catch (e) {
      setErr(String(e.message || e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh(path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, path]);

  function safeSetPath(next) {
    const n = normalize(next);
    if (!isInside(base, n)) {
      setErr("Blocked: you can only browse inside this tab folder.");
      return;
    }
    setPath(n);
  }

  function goToCrumb(index) {
    const next = crumbs.slice(0, index + 1).join("/");
    safeSetPath(next);
  }

  function goUp() {
    if (!crumbs.length) return;
    const next = crumbs.slice(0, -1).join("/");
    if (!isInside(base, next)) return;
    safeSetPath(next);
  }

  function goTabRoot() {
    safeSetPath(base);
  }

  async function handleUpload(e) {
    if (!perms.canUpload) {
      setErr("Uploads are disabled in this tab.");
      e.target.value = "";
      return;
    }

    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setErr("");
    setMsg("Uploading...");

    try {
      const base64 = await fileToBase64(file);
      await uploadBase64(client, path, file.name, base64, file.type || "");
      setMsg("Uploaded ✅");
      await refresh(path);
    } catch (ex) {
      setMsg("");
      setErr(String(ex.message || ex));
    }
  }

  async function handleTrash(name) {
  if (!confirm(`Move "${name}" to Trash?`)) return;

  setErr("");
  setMsg("Moving to Trash...");

  try {
    await trashFile(client, path, name);
    setMsg("Moved to Trash ✅");
    await refresh(path);
  } catch (ex) {
    setMsg("");
    setErr(String(ex.message || ex));
  }
}

  async function handleDownload(name) {
    setErr("");
    setMsg("Downloading...");
    try {
      const blob = await downloadFile(client, path, name);
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
      setMsg("");
    } catch (ex) {
      setMsg("");
      setErr(String(ex.message || ex));
    }
  }

  async function handleCreateFolder() {
    if (!perms.canMkdir) {
      setErr("Creating folders is disabled in this tab.");
      return;
    }

    const folder = newFolderName.trim();
    if (!folder) return;

    setErr("");
    setMsg("Creating folder...");
    try {
      await createFolder(client, path, folder);
      setNewFolderName("");
      setMsg("Folder created ✅");
      await refresh(path);
    } catch (ex) {
      setMsg("");
      setErr(String(ex.message || ex));
    }
  }

  async function handleCreateNote() {
    if (!perms.canWriteText) {
      setErr("Notes are disabled in this tab.");
      return;
    }

    const fileName = newNoteName.trim() || "note.txt";
    const text = newNoteText || "";

    setErr("");
    setMsg("Saving note...");
    try {
      await createTextFile(client, path, fileName, text);
      setNewNoteName("");
      setNewNoteText("");
      setMsg("Note saved ✅");
      await refresh(path);
    } catch (ex) {
      setMsg("");
      setErr(String(ex.message || ex));
    }
  }

  const displayPath = path || "(client root)";

  return (
    <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
      {/* Top controls */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <strong>Path:</strong> <span style={{ fontFamily: "monospace" }}>{displayPath}</span>
        </div>

        <button onClick={() => refresh(path)} disabled={loading || !client}>
          Refresh
        </button>

        <button onClick={goUp} disabled={loading || !crumbs.length || atTabRoot}>
          Up
        </button>

        <button onClick={goTabRoot} disabled={loading || !client || atTabRoot}>
          Go to tab root
        </button>

        {/* ✅ Upload locked by permissions */}
        <label
          style={{
            border: "1px solid #ccc",
            padding: "6px 10px",
            borderRadius: 6,
            cursor: perms.canUpload ? "pointer" : "not-allowed",
            opacity: perms.canUpload ? 1 : 0.5,
          }}
          title={perms.canUpload ? "Upload file" : "Uploads disabled in this tab"}
        >
          Upload file
          <input type="file" onChange={handleUpload} style={{ display: "none" }} disabled={!perms.canUpload} />
        </label>

        {/* Small badge so you can SEE the mode */}
        <span
          style={{
            fontSize: 12,
            padding: "4px 8px",
            borderRadius: 999,
            border: "1px solid #ddd",
            color: "#555",
            background: perms.canUpload || perms.canDelete || perms.canMkdir || perms.canWriteText ? "#fff" : "#f7f7f7",
          }}
          title="Tab permissions"
        >
          {perms.canUpload || perms.canDelete || perms.canMkdir || perms.canWriteText ? "Editable" : "Read-only"}
        </span>
      </div>

      {/* Breadcrumbs */}
      <div style={{ marginTop: 10, fontSize: 14 }}>
        <span style={{ cursor: "default", color: "#999" }} title="This tab is locked to its base folder">
          root
        </span>

        {crumbs.map((c, i) => (
          <span key={i}>
            {" / "}
            <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => goToCrumb(i)}>
              {c}
            </span>
          </span>
        ))}
      </div>

      {msg && <div style={{ marginTop: 10, color: "#0a7" }}>{msg}</div>}
      {err && <div style={{ marginTop: 10, color: "crimson", whiteSpace: "pre-wrap" }}>{err}</div>}

      {/* Create tools */}
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, opacity: perms.canMkdir ? 1 : 0.6 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>New folder</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ flex: 1, padding: 8 }}
              placeholder="e.g. 08 Queries"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              disabled={!perms.canMkdir}
            />
            <button onClick={handleCreateFolder} disabled={loading || !client || !perms.canMkdir}>
              Create
            </button>
          </div>
        </div>

        <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, opacity: perms.canWriteText ? 1 : 0.6 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>New note</div>
          <input
            style={{ width: "100%", padding: 8, marginBottom: 8 }}
            placeholder="File name (e.g. client-note.txt)"
            value={newNoteName}
            onChange={(e) => setNewNoteName(e.target.value)}
            disabled={!perms.canWriteText}
          />
          <textarea
            style={{ width: "100%", padding: 8, minHeight: 70, marginBottom: 8 }}
            placeholder="Type your note..."
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            disabled={!perms.canWriteText}
          />
          <button onClick={handleCreateNote} disabled={loading || !client || !perms.canWriteText}>
            Save note
          </button>
        </div>
      </div>

      {/* File list */}
      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div>Loading…</div>
        ) : items.length === 0 ? (
          <div>No files/folders here yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left" style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  Name
                </th>
                <th align="left" style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  Type
                </th>
                <th align="left" style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.name}>
                  <td style={{ borderBottom: "1px solid #f2f2f2", padding: 8 }}>
                    {it.type === "dir" ? (
                      <span
                        style={{ cursor: "pointer", textDecoration: "underline" }}
                        onClick={() => safeSetPath(joinPath(path, it.name))}
                        title="Open folder"
                      >
                        📁 {it.name}
                      </span>
                    ) : (
                      <span>📄 {it.name}</span>
                    )}
                  </td>
                  <td style={{ borderBottom: "1px solid #f2f2f2", padding: 8 }}>{it.type}</td>
                  <td style={{ borderBottom: "1px solid #f2f2f2", padding: 8 }}>
                    {it.type === "file" ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => handleDownload(it.name)}>Download</button>
                        <button onClick={() => handleTrash(it.name)}>Trash</button>

                      </div>
                    ) : (
                      <span style={{ color: "#999" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}
