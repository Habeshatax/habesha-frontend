// src/pages/Dashboard.jsx (FULL FILE)

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClient, listClients } from "../services/api";
import ServiceFileBrowser from "../components/ServiceFileBrowser";

export default function Dashboard() {
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [loadingClients, setLoadingClients] = useState(true);

  // Create client form
  const [newClient, setNewClient] = useState("");
  const [businessType, setBusinessType] = useState("limited_company"); // default
  const [services, setServices] = useState({
    self_assessment: false,
    landlords: false,
    limited_company: true,
    payroll: true,
    vat_mtd: false,
    bookkeeping: true,
    home_office: false,
  });

  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Option B tabs -> maps to top-level folders created by backend
  const tabs = useMemo(
    () => [
      { key: "eng", label: "Engagement Letter", path: "00 Engagement Letter" },
      { key: "id", label: "Proof of ID", path: "01 Proof of ID" },
      { key: "comp", label: "Compliance", path: "02 Compliance" },
      { key: "work", label: "Work", path: "03 Work" },
      { key: "personal", label: "Personal", path: "04 Personal" },
      { key: "downloads", label: "Downloads", path: "05 Downloads" },
      { key: "trash", label: "Trash", path: "05 Downloads/_Trash" },
    ],
    []
  );

  // ✅ Tab permissions (lock folders per service)
  // You can change these anytime.
  const tabPermissions = useMemo(
  () => ({
    eng: { canUpload: false, canDelete: false, canMkdir: false, canWriteText: false }, // read-only
    id: { canUpload: true, canDelete: false, canMkdir: true, canWriteText: true },     // no delete
    comp: { canUpload: true, canDelete: true, canMkdir: true, canWriteText: true },    // full
    work: { canUpload: true, canDelete: true, canMkdir: true, canWriteText: true },    // full
    personal: { canUpload: true, canDelete: false, canMkdir: true, canWriteText: true }, // safer
    downloads: { canUpload: true, canDelete: true, canMkdir: true, canWriteText: true }, // full
  }),
  []
);

  const [activeTab, setActiveTab] = useState(tabs[0].key);

  const activePath = useMemo(() => tabs.find((t) => t.key === activeTab)?.path || "", [activeTab, tabs]);
  const activePerms = useMemo(() => tabPermissions[activeTab] || null, [activeTab, tabPermissions]);

  // ✅ If user is not logged in, bounce to /login
 
  // Keep services aligned with businessType (helpful defaults)
  useEffect(() => {
    setServices((prev) => {
      const next = { ...prev };

      if (businessType === "self_assessment") {
        next.self_assessment = true;
        next.landlords = false;
        next.limited_company = false;
      } else if (businessType === "landlords") {
        next.landlords = true;
        next.self_assessment = false;
        next.limited_company = false;
      } else if (businessType === "limited_company") {
        next.limited_company = true;
        next.self_assessment = false;
        next.landlords = false;
      }
      return next;
    });
  }, [businessType]);

  async function refreshClients(keepSelection = true) {
    setLoadingClients(true);
    setErr("");
    setMsg("");

    try {
      const data = await listClients();
      const list = data.clients || [];
      setClients(list);

      if (keepSelection && selectedClient && list.includes(selectedClient)) {
        // keep selection
      } else {
        setSelectedClient(list[0] || "");
      }
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoadingClients(false);
    }
  }

  useEffect(() => {
    refreshClients(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleService(key) {
    setServices((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function selectedServicesArray() {
    return Object.entries(services)
      .filter(([, v]) => v)
      .map(([k]) => k);
  }

  async function handleCreateClient(e) {
    if (e?.preventDefault) e.preventDefault();
    if (creating) return;

    const name = newClient.trim();
    if (!name) return;

    setErr("");
    setMsg("");
    setCreating(true);

    try {
      const payload = {
        name,
        businessType,
        services: selectedServicesArray(),
      };

      const data = await createClient(payload);
      setMsg(`Created: ${data.client}`);
      setNewClient("");

      await refreshClients(false);
      setSelectedClient(data.client);

      setActiveTab("comp");
    } catch (e2) {
      setErr(String(e2.message || e2));
    } finally {
      setCreating(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    window.location.replace("/login");
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <button onClick={logout}>Logout</button>
      </div>

      <p style={{ marginTop: 6, color: "#555" }}>Create clients + browse folders by service (tabs).</p>

      {/* Create + Select client */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
        {/* CREATE */}
        <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Create client</h3>

          <form onSubmit={handleCreateClient}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                style={{ flex: 1, padding: 8 }}
                placeholder="e.g. Bubbly Day Nursery Ltd"
                value={newClient}
                onChange={(e) => setNewClient(e.target.value)}
              />
              <button type="submit" disabled={creating || !newClient.trim()}>
                {creating ? "Creating..." : "Create"}
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, color: "#555", marginBottom: 6 }}>Business type</div>
                <select style={{ width: "100%", padding: 8 }} value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
                  <option value="self_assessment">Self Assessment (sole trader)</option>
                  <option value="landlords">Landlords</option>
                  <option value="limited_company">Limited Company</option>
                </select>
              </div>

              <div>
                <div style={{ fontSize: 13, color: "#555", marginBottom: 6 }}>Services (folders)</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={services.self_assessment} onChange={() => toggleService("self_assessment")} disabled={businessType === "self_assessment"} />
                    Self Assessment
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={services.landlords} onChange={() => toggleService("landlords")} disabled={businessType === "landlords"} />
                    Landlords
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={services.limited_company} onChange={() => toggleService("limited_company")} disabled={businessType === "limited_company"} />
                    Limited Company
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={services.bookkeeping} onChange={() => toggleService("bookkeeping")} />
                    Bookkeeping
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={services.vat_mtd} onChange={() => toggleService("vat_mtd")} />
                    MTD VAT
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={services.payroll} onChange={() => toggleService("payroll")} />
                    Payroll
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={services.home_office} onChange={() => toggleService("home_office")} />
                    Home Office / Other
                  </label>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* SELECT */}
        <div style={{ border: "1px solid #ddd", padding: 16, borderRadius: 8 }}>
          <h3 style={{ marginTop: 0 }}>Select client</h3>

          {loadingClients ? (
            <div>Loading clients…</div>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select style={{ flex: 1, padding: 8 }} value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                <option value="">-- select --</option>
                {clients.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button onClick={() => refreshClients(true)}>Refresh</button>
            </div>
          )}

          {selectedClient && (
            <div style={{ marginTop: 10, fontSize: 14, color: "#333" }}>
              Active client: <strong>{selectedClient}</strong>
            </div>
          )}
        </div>
      </div>

      {msg && <div style={{ marginTop: 12, color: "#0a7" }}>{msg}</div>}
      {err && <div style={{ marginTop: 12, color: "crimson", whiteSpace: "pre-wrap" }}>{err}</div>}

      {/* Tabs */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #ccc",
                background: activeTab === t.key ? "#eee" : "white",
                cursor: "pointer",
              }}
              disabled={!selectedClient}
              title={t.path}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          {!selectedClient ? (
            <div style={{ padding: 16, border: "1px dashed #bbb", borderRadius: 8 }}>Select a client to view folders.</div>
          ) : (
            <ServiceFileBrowser client={selectedClient} basePath={activePath} permissions={activePerms} />
          )}
        </div>
      </div>
    </div>
  );
}
