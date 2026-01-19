// src/pages/ClientFiles.jsx (FULL FILE)

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { deleteFile, downloadFile, listClientItems, uploadBase64 } from "../services/api";

function fileToBase64DataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(reader.result); // data:*/*;base64,...
    reader.readAsDataURL(file);
  });
}

function triggerBrowserDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ClientFiles() {
  const params = useParams();
  const client = useMemo(() => decodeURIComponent(params.client || ""), [params]);

  // Optional: later you can support folders with a "path" state
  const [path, setPath] = useState(""); // "" = client root

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    setLoading(true);
    try {
      const data = await listClientItems(client, path);
      setItems(data.items || []);
    } catch (e) {
      setError(e?.message || "Failed to load files");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, path]);

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError("");
    try {
      const base64 = await fileToBase64DataUrl(file);
      await uploadBase64(client, path, file.name, base64, file.type || "");
      await load();
    } catch (err) {
      setError(err?.message || "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function onDelete(fileName) {
    if (!confirm(`Move "${fileName}" to Trash?`)) return;

    setBusy(true);
    setError("");
    try {
      // deleteFile is mapped to backend /trash route in api.js
      await deleteFile(client, path, fileName);
      await load();
    } catch (err) {
      setError(err?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDownload(fileName) {
    setBusy(true);
    setError("");
    try {
      const blob = await downloadFile(client, path, fileName);
      triggerBrowserDownload(blob, fileName);
    } catch (err) {
      setError(err?.message || "Download failed");
    } finally {
      setBusy(false);
    }
  }

  const files = items.filter((x) => x.type === "file");
  const dirs = items.filter((x) => x.type === "dir");

  return (
    <div style={{ padding: 24, maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0, flex: 1 }}>Client Files</h1>
        <Link to="/dashboard">← Back</Link>
      </div>

      <p style={{ marginTop: 8 }}>
        Client: <strong>{client}</strong>
      </p>

      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Folder: <strong>{path || "(root)"}</strong>
      </p>

      {error && <div style={{ color: "crimson", margin: "12px 0" }}>{error}</div>}

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16 }}>
        <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <span>Upload file:</span>
          <input type="file" onChange={onUpload} disabled={busy} />
        </label>

        <button onClick={load} disabled={loading || busy}>
          Refresh
        </button>

        {(busy || loading) && <span>Working...</span>}
      </div>

      <hr style={{ margin: "24px 0" }} />

      <h2>Folders</h2>
      {dirs.length === 0 ? (
        <p>No folders</p>
      ) : (
        <ul style={{ paddingLeft: 18 }}>
          {dirs.map((d) => (
            <li key={d.name} style={{ marginBottom: 6 }}>
              <button
                onClick={() => setPath(path ? `${path}/${d.name}` : d.name)}
                disabled={busy}
                style={{ cursor: "pointer" }}
              >
                Open
              </button>{" "}
              <span style={{ marginLeft: 8 }}>{d.name}</span>
            </li>
          ))}
        </ul>
      )}

      {path && (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => {
              const parts = path.split("/").filter(Boolean);
              parts.pop();
              setPath(parts.join("/"));
            }}
            disabled={busy}
          >
            ↑ Up one folder
          </button>{" "}
          <button onClick={() => setPath("")} disabled={busy}>
            Back to root
          </button>
        </div>
      )}

      <h2 style={{ marginTop: 24 }}>Files</h2>
      {files.length === 0 ? (
        <p>No files</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                File
              </th>
              <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.name}>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{f.name}</td>
                <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                  <button onClick={() => onDownload(f.name)} disabled={busy} style={{ marginRight: 12 }}>
                    Download
                  </button>
                  <button onClick={() => onDelete(f.name)} disabled={busy}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
