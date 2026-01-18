// src/pages/Dashboard.jsx (FULL FILE)

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { listClients } from "../services/api";

// If you already use ServiceFileBrowser in your dashboard, keep this import.
// If not, you can remove it.
import ServiceFileBrowser from "../components/ServiceFileBrowser";

function safeRole(user) {
  return user?.role === "admin" ? "admin" : "client";
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const role = safeRole(user);

  // Admin: list of clients
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientsError, setClientsError] = useState("");

  // Tabs (match your folder structure)
  const tabs = useMemo(
    () => [
      { key: "engagement", label: "Engagement", basePath: "00 Engagement Letter" },
      { key: "proof", label: "Proof of ID", basePath: "01 Proof of ID" },
      { key: "compliance", label: "Compliance", basePath: "02 Compliance" },
      { key: "work", label: "Work", basePath: "03 Work" },
      { key: "downloads", label: "Downloads", basePath: "05 Downloads" },
    ],
    []
  );

  const [tabKey, setTabKey] = useState("downloads");
  const activeTab = useMemo(() => tabs.find((t) => t.key === tabKey) || tabs[0], [tabs, tabKey]);

  // Determine which client folder to browse
  const clientToBrowse = role === "admin" ? selectedClient : user?.client || "";

  // Permissions per tab (you can tweak)
  const permissions = useMemo(() => {
    // Example: make Engagement/Proof read-only for clients if you want
    if (role === "client") {
      if (tabKey === "engagement") return { canUpload: true, canDelete: true, canMkdir: false, canWriteText: true };
      if (tabKey === "proof") return { canUpload: true, canDelete: true, canMkdir: true, canWriteText: true };
    }
    // Admin default: full access
    return { canUpload: true, canDelete: true, canMkdir: true, canWriteText: true };
  }, [role, tabKey]);

  // Admin: load clients list
  useEffect(() => {
    if (role !== "admin") return;

    let cancelled = false;
    async function load() {
      setLoadingClients(true);
      setClientsError("");
      try {
        const data = await listClients();
        const list = data?.clients || [];
        if (!cancelled) {
          setClients(list);
          // auto-select first client if none selected
          if (!selectedClient && list.length > 0) {
            setSelectedClient(list[0].client);
          }
        }
      } catch (e) {
        if (!cancelled) setClientsError(String(e?.message || e));
      } finally {
        if (!cancelled) setLoadingClients(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  return (
    <div className="ui-shell">
      {/* Top bar */}
      <div className="ui-topbar" style={{ marginBottom: 18 }}>
        <div>
          <h1 className="ui-title">Dashboard</h1>
          <div className="ui-sub">
            Signed in as <strong>{role === "admin" ? "Admin" : "Client"}</strong>
            {user?.email ? <> · {user.email}</> : null}
            {role === "client" && user?.client ? <> · Folder: <strong>{user.client}</strong></> : null}
          </div>
        </div>

        <div className="ui-row">
          <button className="ui-btn" onClick={logout}>
            Log out
          </button>
        </div>
      </div>

      {/* Admin: choose client */}
      {role === "admin" && (
        <div className="ui-card ui-card-pad" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Admin controls</div>

          {loadingClients ? (
            <div className="ui-note">Loading clients…</div>
          ) : clientsError ? (
            <div className="ui-err">{clientsError}</div>
          ) : clients.length === 0 ? (
            <div className="ui-note">No clients found yet.</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
              <div>
                <label className="ui-note" style={{ display: "block", marginBottom: 6 }}>
                  Select a client to browse folders
                </label>
                <select
                  className="ui-input"
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                >
                  {clients.map((c) => (
                    <option key={c.client} value={c.client}>
                      {c.client} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="ui-note">
                Tip: This is the backend folder name created during registration.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="ui-card ui-card-pad" style={{ marginBottom: 14 }}>
        <div className="ui-row" style={{ flexWrap: "wrap" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`ui-tab ${tabKey === t.key ? "ui-tab-active" : ""}`}
              onClick={() => setTabKey(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ui-sub" style={{ marginTop: 10 }}>
          Current section: <strong>{activeTab.label}</strong>
        </div>
      </div>

      {/* Main browser */}
      <div className="ui-card ui-card-pad">
        {!clientToBrowse ? (
          <div className="ui-note">
            {role === "admin" ? "Select a client above to browse their folders." : "No client folder assigned."}
          </div>
        ) : (
          <ServiceFileBrowser
            client={clientToBrowse}
            basePath={activeTab.basePath}
            permissions={permissions}
          />
        )}
      </div>
    </div>
  );
}
