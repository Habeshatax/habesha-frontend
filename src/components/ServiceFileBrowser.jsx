import { useEffect, useMemo, useState } from "react";
import {
  listClientItems,
  uploadBase64,
  downloadFile,
  createFolder,
  createTextFile,
  trashItem,
  restoreItem,
  deleteTrashItem,
  emptyTrash,
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

const TRASH_ROOT = "05 Downloads/_Trash";
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export default function ServiceFileBrowser({
  client,
  basePath,
  permissions,
  initialTrashMode = false,
  uploadHint = "",
  onUploaded,
}) {
  const base = useMemo(() => normalize(basePath), [basePath]);

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
  const [trashRel, setTrashRel] = useState("");
  const [trashMode, setTrashMode] = useState(!!initialTrashMode);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [newFolderName, setNewFolderName] = useState("");
  const [newNoteName, setNewNoteName] = useState("");
  const [newNoteText, setNewNoteText] = useState("");

  useEffect(() => {
    setPath(base);
    setTrashRel("");
    setTrashMode(!!initialTrashMode);
    setItems([]);
    setMsg("");
    setErr("");
  }, [client, base, initialTrashMode]);

  const crumbs = useMemo(() => {
    const clean = trashMode ? normalize(trashRel) : normalize(path);
    if (!clean) return [];
    return clean.split("/");
  }, [trashMode, trashRel, path]);

  const atTabRoot = useMemo(() => normalize(path) === normalize(base), [path, base]);
  const atTrashRoot = useMemo(() => normalize(trashRel) === "", [trashRel]);

  const effectivePath = useMemo(() => {
    if (!trashMode) return path;
    return joinPath(TRASH_ROOT, trashRel);
  }, [trashMode, path, trashRel]);

  async function refresh(forPath = effectivePath) {
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
    refresh(effectivePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, effectivePath]);

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
    if (trashMode) setTrashRel(next);
    else safeSetPath(next);
  }

  function goUp() {
    if (!crumbs.length) return;
    const next = crumbs.slice(0, -1).join("/");

    if (trashMode) {
      setTrashRel(next);
      return;
    }

    if (!isInside(base, next)) return;
    safeSetPath(next);
  }

  function goTabRoot() {
    safeSetPath(base);
  }

  function goTrashRoot() {
    setTrashRel("");
  }

  async function handleUpload(e) {
    if (!perms.canUpload) {
      setErr("Uploads are disabled in this tab.");
      e.target.value = "";
      return;
    }

    if (trashMode) {
      setErr("Uploads are disabled while viewing Trash.");
      e.target.value = "";
      return;
    }

    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      setErr("File too large. Max upload is 25MB.");
      return;
    }

    setErr("");
    setMsg("Uploading...");

    try {
      const base64 = await fileToBase64(file);
      await uploadBase64(client, path, file.name, base64, file.type || "");
      setMsg("Uploaded ✅");

      if (typeof onUploaded === "function") onUploaded(file.name);

      await refresh(effectivePath);
    } catch (ex) {
      setMsg("");
      setErr(String(ex.message || ex));
    }
  }

  async function handleTrash(name) {
    if (!perms.canDelete) {
      setErr("Deleting is disabled in this tab.");
      return;
    }

    if (trashMode) {
      setErr("You are viewing Trash. Use Restore / Delete instead.");
      return;
    }

    if (!confirm(`Move "${name}" to Trash?`)) return;

    setErr("");
    setMsg("Moving to Trash...");

    try {
      await trashItem(client, path, String(name).trim());
      setMsg("Moved to Trash ✅");
      await refresh(effectivePath);
    } catch (ex) {
      setMsg("");
      setErr(String(ex.message || ex));
    }
  }

  async function handleRestore(name) {
    if (!confirm(`Restore "${name}" from Trash?`)) return;

    setErr("");
    setMsg("Restoring...");

    try {
      await restoreItem(client, trashRel, String(name).trim());
      setMsg("Restored ✅");
      await refresh(effectivePath);
    } catch (ex) {
      setMsg("");
      setErr(String(ex.message || ex));
    }
  }

  async function handleDeleteFromTrash(name) {
    const scope = trashRel ? `TRASH / ${trashRel}` : "TRASH ROOT";

    if (!confirm(`Permanently delete "${name}" from ${scope}?\n\nThis cannot be undone.`)) return;

    setErr("");
    setMsg("Deleting permanently...");

    try {
      await deleteTrashItem(client, trashRel, String(name).trim());
      setMsg("Deleted permanently ✅");
      await refresh(effectivePath);
    } catch (ex) {
      setMsg("");
      setErr(String(ex.message || ex));
    }
  }

  async function handleEmptyTrash() {
    const scope = trashRel ? `TRASH / ${trashRel}` : "ENTIRE TRASH";

    if (!confirm(`Empty ${scope}?\n\nThis permanently deletes everything inside and cannot be undone.`)) return;

    setErr("");
    setMsg("Emptying Trash...");

    try {
      await emptyTrash(client, trashRel);
      setMsg("Trash emptied ✅");
      await refresh(effectivePath);
    } catch (ex) {
      setMsg("");
      setErr(String(ex.message || ex));
    }
  }

  async function handleDownload(name) {
    setErr("");
    setMsg("Preparing download...");
    try {
      const blob = await downloadFile(client, effectivePath, String(name).trim());

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
    if (!perms.canMkdir) return setErr("Creating folders is disabled in this tab.");
    if (trashMode) return setErr("Creating folders is disabled while viewing Trash.");

    const folder = newFolderName.trim();
    if (!folder) return;

    setErr("");
    setMsg("Creating folder...");
    try {
      await createFolder(client, path, folder);
      setNewFolderName("");
      setMsg("Folder created ✅");
      await refresh(effectivePath);
    } catch (ex) {
      setMsg("");
      setErr(String(ex.message || ex));
    }
  }

  async function handleCreateNote() {
    if (!perms.canWriteText) return setErr("Notes are disabled in this tab.");
    if (trashMode) return setErr("Notes are disabled while viewing Trash.");

    const fileName = newNoteName.trim() || "note.txt";
    const text = newNoteText || "";

    setErr("");
    setMsg("Saving note...");
    try {
      await createTextFile(client, path, fileName, text);
      setNewNoteName("");
      setNewNoteText("");
      setMsg("Note saved ✅");
      await refresh(effectivePath);
    } catch (ex) {
      setMsg("");
      setErr(String(ex.message || ex));
    }
  }

  const displayPath = trashMode ? `TRASH / ${trashRel || "(root)"}` : `FILES / ${path || "(tab root)"}`;

  return (
    <div className="ui-card ui-card-pad">
      <div className="ui-row" style={{ justifyContent: "space-between" }}>
        <div>
          <div className="ui-note">
            <strong>Path:</strong> <span className="ui-mono">{displayPath}</span>
          </div>

          {/* Breadcrumbs */}
          <div style={{ marginTop: 6 }} className="ui-note">
            <span style={{ color: "#9ca3af" }}>{trashMode ? "TRASH" : "root"}</span>
            {crumbs.map((c, i) => (
              <span key={i}>
                {" / "}
                <span className="ui-link" onClick={() => goToCrumb(i)}>
                  {c}
                </span>
              </span>
            ))}
          </div>
        </div>

        <div className="ui-row">
          <button className="ui-btn" onClick={() => refresh(effectivePath)} disabled={loading || !client}>
            Refresh
          </button>

          <button
            className="ui-btn"
            onClick={goUp}
            disabled={loading || !crumbs.length || (!trashMode && atTabRoot) || (trashMode && atTrashRoot)}
          >
            Up
          </button>

          {!trashMode ? (
            <button className="ui-btn" onClick={goTabRoot} disabled={loading || !client || atTabRoot}>
              Tab root
            </button>
          ) : (
            <button className="ui-btn" onClick={goTrashRoot} disabled={loading || !client || atTrashRoot}>
              Trash root
            </button>
          )}

          <button
            className="ui-btn ui-btn-ghost"
            onClick={() => {
              setErr("");
              setMsg("");
              setTrashMode((v) => {
                const next = !v;
                if (next) setTrashRel("");
                return next;
              });
            }}
            disabled={loading || !client}
            title="Global Trash for this client"
          >
            {trashMode ? "Back to Files" : "View Trash"}
          </button>

          {trashMode && (
            <button className="ui-btn ui-btn-danger" onClick={handleEmptyTrash} disabled={loading || !client}>
              Empty Trash
            </button>
          )}

          <label className="ui-btn ui-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            Upload
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleUpload}
              style={{ display: "none" }}
              disabled={!perms.canUpload || trashMode}
            />
          </label>
        </div>
      </div>

      {uploadHint ? <div className="ui-note" style={{ marginTop: 10 }}>{uploadHint}</div> : null}
      {msg ? <div style={{ marginTop: 10 }} className="ui-ok">{msg}</div> : null}
      {err ? <div style={{ marginTop: 10 }} className="ui-err">{err}</div> : null}

      {/* Create tools */}
      <div style={{ marginTop: 14 }} className="ui-grid-2">
        <div className="ui-card ui-card-pad" style={{ boxShadow: "none" }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>New folder</div>
          <div className="ui-row">
            <input
              className="ui-input"
              style={{ flex: 1 }}
              placeholder="e.g. 08 Queries"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              disabled={!perms.canMkdir || trashMode}
            />
            <button className="ui-btn ui-btn-primary" onClick={handleCreateFolder} disabled={loading || !client || !perms.canMkdir || trashMode}>
              Create
            </button>
          </div>
        </div>

        <div className="ui-card ui-card-pad" style={{ boxShadow: "none" }}>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>New note</div>
          <input
            className="ui-input"
            placeholder="File name (e.g. client-note.txt)"
            value={newNoteName}
            onChange={(e) => setNewNoteName(e.target.value)}
            disabled={!perms.canWriteText || trashMode}
          />
          <div style={{ height: 10 }} />
          <textarea
            className="ui-textarea"
            placeholder="Type your note..."
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            disabled={!perms.canWriteText || trashMode}
          />
          <div style={{ height: 10 }} />
          <button className="ui-btn ui-btn-primary" onClick={handleCreateNote} disabled={loading || !client || !perms.canWriteText || trashMode}>
            Save note
          </button>
        </div>
      </div>

      {/* File list */}
      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div className="ui-note">Loading…</div>
        ) : items.length === 0 ? (
          <div className="ui-note">{trashMode ? "Trash is empty ✅" : "No files/folders here yet."}</div>
        ) : (
          <table className="ui-table">
            <thead>
              <tr>
                <th>Name</th>
                <th style={{ width: 120 }}>Type</th>
                <th style={{ width: 320 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.name}>
                  <td>
                    {it.type === "dir" ? (
                      <span
                        className="ui-link"
                        onClick={() => {
                          if (trashMode) setTrashRel(joinPath(trashRel, it.name));
                          else safeSetPath(joinPath(path, it.name));
                        }}
                        title="Open folder"
                      >
                        📁 {it.name}
                      </span>
                    ) : (
                      <span>📄 {it.name}</span>
                    )}
                  </td>

                  <td className="ui-note">{it.type}</td>

                  <td>
                    {trashMode ? (
                      <div className="ui-row">
                        {it.type === "file" && (
                          <button className="ui-btn" onClick={() => handleDownload(it.name)}>
                            Download
                          </button>
                        )}
                        <button className="ui-btn ui-btn-primary" onClick={() => handleRestore(it.name)}>
                          Restore
                        </button>
                        <button className="ui-btn ui-btn-danger" onClick={() => handleDeleteFromTrash(it.name)}>
                          Delete
                        </button>
                      </div>
                    ) : it.type === "file" ? (
                      <div className="ui-row">
                        <button className="ui-btn" onClick={() => handleDownload(it.name)}>
                          Download
                        </button>
                        <button className="ui-btn" onClick={() => handleTrash(it.name)} disabled={!perms.canDelete}>
                          Trash
                        </button>
                      </div>
                    ) : (
                      <div className="ui-row">
                        <button className="ui-btn ui-btn-primary" onClick={() => safeSetPath(joinPath(path, it.name))}>
                          Open
                        </button>
                        <button className="ui-btn" onClick={() => handleTrash(it.name)} disabled={!perms.canDelete}>
                          Trash
                        </button>
                      </div>
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
