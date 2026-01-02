import express from "express";
import path from "path";
import fs from "fs";
import os from "os";

const app = express();
app.use(express.json());

// ---------- Config ----------
const PORT = process.env.PORT || 8787;
const AUTH_TOKEN = process.env.AUTH_TOKEN || ""; // MUST be set on Render

// Base folder (Windows local default). On Render you should set BASE_DIR to a path on the disk or use OneDrive Graph later.
const DEFAULT_WINDOWS_BASE =
  path.join(os.homedir(), "OneDrive", "Documents", "Habesha");

const BASE = process.env.BASE_DIR || DEFAULT_WINDOWS_BASE;

// IMPORTANT: client folders live inside "02 Clients"
const CLIENTS_BASE = path.join(BASE, "02 Clients");

// ---------- Helpers ----------
function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function sanitizeName(name) {
  return String(name || "")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ");
}

function checkAuth(req, res) {
  const token = req.header("X-Auth-Token") || "";
  if (!AUTH_TOKEN || token !== AUTH_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

function listClientFolders() {
  ensureDir(CLIENTS_BASE);

  const items = fs.readdirSync(CLIENTS_BASE, { withFileTypes: true });
  return items
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    // Ignore your base folders if they exist under 02 Clients (optional)
    .filter((name) => !/^__/.test(name))
    .sort((a, b) => a.localeCompare(b));
}

function createClientFolderStructure(clientName, services = {}) {
  const name = sanitizeName(clientName);
  if (!name) throw new Error("Client name is required.");

  const clientPath = path.join(CLIENTS_BASE, name);
  ensureDir(clientPath);

  // Common structure
  ensureDir(path.join(clientPath, "00 Admin"));
  ensureDir(path.join(clientPath, "01 Letters"));
  ensureDir(path.join(clientPath, "02 HMRC"));
  ensureDir(path.join(clientPath, "03 Accounts"));

  // Services
  if (services.bookkeeping) ensureDir(path.join(clientPath, "Bookkeeping"));
  if (services.vat) ensureDir(path.join(clientPath, "VAT"));
  if (services.payroll) ensureDir(path.join(clientPath, "Payroll (PAYE)"));
  if (services.mtd) ensureDir(path.join(clientPath, "MTD (ITSA)"));
  if (services.extra) ensureDir(path.join(clientPath, "Other extra-service"));

  return clientPath;
}

// ---------- API ----------
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/base", (req, res) => {
  if (!checkAuth(req, res)) return;
  res.json({ base: BASE, clientsBase: CLIENTS_BASE });
});

app.get("/api/clients", (req, res) => {
  if (!checkAuth(req, res)) return;
  const clients = listClientFolders();
  res.json({ clients });
});

app.post("/api/client/create", (req, res) => {
  if (!checkAuth(req, res)) return;
  const { clientName, services } = req.body || {};
  const clientPath = createClientFolderStructure(clientName, services || {});
  res.json({ ok: true, clientPath });
});

app.post("/api/base/create-missing", (req, res) => {
  if (!checkAuth(req, res)) return;

  // Ensure top base folders exist
  ensureDir(BASE);
  ensureDir(path.join(BASE, "01 Work"));
  ensureDir(path.join(BASE, "02 Clients"));
  ensureDir(path.join(BASE, "03 Finance"));
  ensureDir(path.join(BASE, "04 Personal"));
  ensureDir(path.join(BASE, "05 Downloads"));

  // Ensure clients root exists
  ensureDir(CLIENTS_BASE);

  res.json({ ok: true });
});

// ---------- UI ----------
app.get("/", (req, res) => {
  res.type("html").send(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Habesha Folder Manager</title>
  <style>
    body{font-family:system-ui,Segoe UI,Arial; margin:20px; color:#111}
    .card{border:1px solid #e5e5e5; border-radius:12px; padding:16px; margin:12px 0}
    .grid{display:grid; grid-template-columns: 1fr 1fr; gap:12px}
    @media (max-width: 900px){ .grid{grid-template-columns:1fr} }
    label{display:block; font-weight:600; margin:10px 0 6px}
    input, select{width:100%; padding:10px; border:1px solid #ddd; border-radius:10px}
    button{padding:10px 14px; border:1px solid #ddd; border-radius:10px; cursor:pointer; background:#fff}
    .row{display:flex; gap:10px; align-items:center; flex-wrap:wrap}
    .ok{color:#0a7f2e; font-weight:600}
    .err{color:#b00020; font-weight:600}
    .muted{color:#666}
  </style>
</head>
<body>
  <h1>Habesha Folder Manager <small class="muted">Web</small></h1>
  <div class="muted">Runs on your Windows PC. Open this page from iPad/phone on the same WiFi.</div>

  <div class="card">
    <h2>1) Login</h2>
    <label for="tokenInput">Token (X-Auth-Token)</label>
    <input id="tokenInput" placeholder="Enter token..." autocomplete="off"/>

    <div class="row" style="margin-top:10px">
      <button id="saveBtn" type="button">Save Token</button>
      <button id="connectBtn" type="button">Connect</button>
      <div id="loginMsg" class="muted"></div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h2>2) Quick Open (opens on PC)</h2>
      <div class="row">
        <button type="button" data-open="01 Work">01 Work</button>
        <button type="button" data-open="02 Clients">02 Clients</button>
        <button type="button" data-open="03 Finance">03 Finance</button>
        <button type="button" data-open="04 Personal">04 Personal</button>
        <button type="button" data-open="05 Downloads">05 Downloads</button>
      </div>
      <div style="margin-top:10px" class="muted">Tip: On mobile this triggers Explorer to open on your PC.</div>
      <div style="margin-top:12px">
        <button id="createBaseBtn" type="button">Create Missing Base Folders</button>
      </div>
    </div>

    <div class="card">
      <h2>3) Tax Years</h2>
      <label for="taxYearInput">Add tax year</label>
      <div class="row">
        <input id="taxYearInput" placeholder="e.g. 2026-27"/>
        <button type="button" id="addTaxYearBtn">Add</button>
      </div>
      <div id="taxYearsList" class="muted" style="margin-top:10px"></div>
    </div>
  </div>

  <div class="grid">
    <div class="card">
      <h2>4) Create New Client</h2>

      <label for="clientNameInput">Client name</label>
      <input id="clientNameInput" placeholder="e.g. Bright SG Ltd"/>

      <label for="clientTypeCreate">Client type</label>
      <select id="clientTypeCreate">
        <option>Self-Employed</option>
        <option>Limited Company</option>
      </select>

      <label for="directorsCreate">Directors (Limited Company)</label>
      <input id="directorsCreate" value="1"/>

      <div style="margin-top:10px">
        <label><input id="svcBookkeeping" type="checkbox"/> Bookkeeping</label>
        <label><input id="svcVat" type="checkbox"/> VAT</label>
        <label><input id="svcPayroll" type="checkbox"/> Payroll (PAYE)</label>
        <label><input id="svcMtd" type="checkbox"/> MTD (ITSA)</label>
        <label><input id="svcExtra" type="checkbox"/> Other extra-service</label>
      </div>

      <div class="row" style="margin-top:12px">
        <button id="createClientBtn" type="button">Create</button>
        <div id="createMsg" class="muted"></div>
      </div>
    </div>

    <div class="card">
      <h2>5) Update Client Registration</h2>

      <label for="clientSelect">Select client</label>
      <select id="clientSelect">
        <option value="">-- choose client --</option>
      </select>

      <div class="row" style="margin-top:12px">
        <button id="refreshClientsBtn" type="button">Refresh client list</button>
        <div id="clientsMsg" class="muted"></div>
      </div>

      <div class="muted" style="margin-top:10px">
        Note: unticking a service removes its folders (Bookkeeping / VAT / PAYE / MTD / Extra).
      </div>
    </div>
  </div>

<script>
  const tokenInput = document.getElementById("tokenInput");
  const loginMsg = document.getElementById("loginMsg");
  const clientSelect = document.getElementById("clientSelect");
  const clientsMsg = document.getElementById("clientsMsg");
  const createMsg = document.getElementById("createMsg");

  function getToken(){
    return localStorage.getItem("habesha_token") || "";
  }
  function setToken(t){
    localStorage.setItem("habesha_token", t);
  }

  async function api(url, opts={}){
    const token = getToken();
    const headers = Object.assign(
      { "Content-Type":"application/json", "X-Auth-Token": token },
      (opts.headers||{})
    );
    const res = await fetch(url, { ...opts, headers });
    if(!res.ok){
      const txt = await res.text().catch(()=> "");
      throw new Error(res.status + " " + (txt || res.statusText));
    }
    return res.json();
  }

  async function refreshClients(){
    clientsMsg.textContent = "Loading clients...";
    const data = await api("/api/clients");
    const clients = data.clients || [];

    // rebuild dropdown
    clientSelect.innerHTML = '<option value="">-- choose client --</option>';
    for(const c of clients){
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      clientSelect.appendChild(opt);
    }
    clientsMsg.innerHTML = clients.length
      ? '<span class="ok">Loaded ' + clients.length + ' client(s).</span>'
      : '<span class="err">No client folders found in 02 Clients.</span>';
  }

  // Buttons
  document.getElementById("saveBtn").onclick = () => {
    const t = tokenInput.value.trim();
    setToken(t);
    loginMsg.innerHTML = '<span class="ok">Token saved.</span>';
  };

  document.getElementById("connectBtn").onclick = async () => {
    try{
      const t = tokenInput.value.trim();
      if(t) setToken(t);

      const info = await api("/api/base");
      loginMsg.innerHTML = '<span class="ok">Connected.</span> <span class="muted">Base: ' + info.base + '</span>';
      await refreshClients();
    }catch(e){
      loginMsg.innerHTML = '<span class="err">Unauthorized</span> <span class="muted">' + e.message + '</span>';
    }
  };

  document.getElementById("refreshClientsBtn").onclick = async () => {
    try{ await refreshClients(); }catch(e){ clientsMsg.innerHTML = '<span class="err">' + e.message + '</span>'; }
  };

  document.getElementById("createBaseBtn").onclick = async () => {
    try{
      await api("/api/base/create-missing", { method:"POST", body: JSON.stringify({}) });
      await refreshClients();
      alert("Base folders created (if missing).");
    }catch(e){
      alert("Error: " + e.message);
    }
  };

  document.getElementById("createClientBtn").onclick = async () => {
    try{
      createMsg.textContent = "Creating...";
      const clientName = document.getElementById("clientNameInput").value.trim();
      const services = {
        bookkeeping: document.getElementById("svcBookkeeping").checked,
        vat: document.getElementById("svcVat").checked,
        payroll: document.getElementById("svcPayroll").checked,
        mtd: document.getElementById("svcMtd").checked,
        extra: document.getElementById("svcExtra").checked
      };
      await api("/api/client/create", { method:"POST", body: JSON.stringify({ clientName, services })});
      createMsg.innerHTML = '<span class="ok">Client created.</span>';
      await refreshClients();
    }catch(e){
      createMsg.innerHTML = '<span class="err">' + e.message + '</span>';
    }
  };

  // init
  tokenInput.value = getToken();
</script>
</body>
</html>
  `);
});

// ---------- Start ----------
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Habesha web running on http://localhost:${PORT}`);
  console.log(`AUTH_TOKEN set: ${AUTH_TOKEN ? "YES" : "NO"}`);
  console.log(`BASE: ${BASE}`);
  console.log(`CLIENTS_BASE: ${CLIENTS_BASE}`);
});
