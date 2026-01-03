js
// server.js (FULL FILE - copy/paste)

import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const app = express();

// ----- ESM __dirname fix -----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----- Middleware -----
app.use(express.json({ limit: "25mb" }));

// ----- Config -----
const PORT = process.env.PORT || 8787;
const AUTH_TOKEN = (process.env.AUTH_TOKEN || "").trim();

/**
* Storage directory
* - If you attach a Render Disk: use /var/data/...
* - Otherwise /tmp works but is not permanent
*/
const BASE_DIR =
process.env.BASE_DIR ||
(process.env.RENDER
? "/var/data/habesha"
: path.join(os.homedir(), "Documents", "Habesha"));

const CLIENTS_DIR = path.join(BASE_DIR, "clients");

// ----- Helpers -----
function ensureDir(p) {
if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function safeName(input) {
// allow letters, numbers, dash, underscore, dot
return String(input || "")
.trim()
.replace(/[^a-zA-Z0-9._-]/g, "_")
.slice(0, 120);
}

function resolveInside(base, target) {
const full = path.resolve(base, target);
const baseResolved = path.resolve(base);
if (!full.startsWith(baseResolved)) throw new Error("Invalid path");
return full;
}

function getTokenFromReq(req) {
const auth = req.headers.authorization || "";
if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
if (req.query && req.query.token) return String(req.query.token).trim();
return "";
}

// Protect only /api routes
function requireAuth(req, res, next) {
// If AUTH_TOKEN is not set on Render, do not hard-lock
if (!AUTH_TOKEN) return next();

const token = getTokenFromReq(req);
if (token !== AUTH_TOKEN) {
return res.status(401).json({ ok: false, error: "Unauthorized" });
}
next();
}

// Ensure folders exist
ensureDir(CLIENTS_DIR);

// ----- Health (important for Render + Cloudflare) -----
app.get("/health", (req, res) => res.status(200).send("ok"));

app.get("/api/health", (req, res) =>
res.status(200).json({
ok: true,
service: "habeshaweb",
port: PORT,
baseDir: BASE_DIR,
clientsDir: CLIENTS_DIR,
authTokenSet: AUTH_TOKEN ? true : false,
})
);

// ----- Home page -----
app.get("/", (req, res) => {
res
.status(200)
.send("HabeshaWeb backend is running. Try /health or /api/health");
});

// ----- API (protected) -----
app.use("/api", requireAuth);

// List clients (folders)
app.get("/api/clients", (req, res) => {
try {
const items = fs
.readdirSync(CLIENTS_DIR, { withFileTypes: true })
.filter((d) => d.isDirectory())
.map((d) => d.name)
.sort((a, b) => a.localeCompare(b));

res.json({ ok: true, clients: items });
} catch (e) {
res.status(500).json({ ok: false, error: e.message });
}
});

// Create client folder
app.post("/api/clients", (req, res) => {
try {
const name = safeName(req.body?.name);
if (!name) return res.status(400).json({ ok: false, error: "Client name required" });

const clientPath = resolveInside(CLIENTS_DIR, name);
ensureDir(clientPath);

res.json({ ok: true, client: name });
} catch (e) {
res.status(500).json({ ok: false, error: e.message });
}
});

// List files for a client
app.get("/api/clients/:client/files", (req, res) => {
try {
const client = safeName(req.params.client);
const clientPath = resolveInside(CLIENTS_DIR, client);
ensureDir(clientPath);

const items = fs.readdirSync(clientPath, { withFileTypes: true }).map((d) => ({
name: d.name,
type: d.isDirectory() ? "dir" : "file",
}));

res.json({ ok: true, client, items });
} catch (e) {
res.status(500).json({ ok: false, error: e.message });
}
});

// Download a file: /api/clients/{client}/download?file=some.pdf
app.get("/api/clients/:client/download", (req, res) => {
try {
const client = safeName(req.params.client);
const file = String(req.query.file || "");
if (!file) return res.status(400).json({ ok: false, error: "file query required" });

const clientPath = resolveInside(CLIENTS_DIR, client);
const full = resolveInside(clientPath, file);

if (!fs.existsSync(full)) return res.status(404).json({ ok: false, error: "Not found" });
if (fs.statSync(full).isDirectory()) {
return res.status(400).json({ ok: false, error: "Not a file" });
}

res.download(full);
} catch (e) {
res.status(500).json({ ok: false, error: e.message });
}
});

// Upload base64
// Body: { fileName: "abc.pdf", base64: "data:application/pdf;base64,...." } OR raw base64
app.post("/api/clients/:client/uploadBase64", (req, res) => {
try {
const client = safeName(req.params.client);
const fileName = safeName(req.body?.fileName);
const base64Input = String(req.body?.base64 || "");

if (!fileName) return res.status(400).json({ ok: false, error: "fileName required" });
if (!base64Input) return res.status(400).json({ ok: false, error: "base64 required" });

const clientPath = resolveInside(CLIENTS_DIR, client);
ensureDir(clientPath);

const full = resolveInside(clientPath, fileName);

const cleaned = base64Input.includes("base64,")
? base64Input.split("base64,")[1]
: base64Input;

const buf = Buffer.from(cleaned, "base64");
fs.writeFileSync(full, buf);

res.json({ ok: true, savedAs: fileName, bytes: buf.length });
} catch (e) {
res.status(500).json({ ok: false, error: e.message });
}
});

// Delete file: /api/clients/{client}/file?file=abc.pdf
app.delete("/api/clients/:client/file", (req, res) => {
try {
const client = safeName(req.params.client);
const file = String(req.query.file || "");
if (!file) return res.status(400).json({ ok: false, error: "file query required" });

const clientPath = resolveInside(CLIENTS_DIR, client);
const full = resolveInside(clientPath, file);

if (!fs.existsSync(full)) return res.status(404).json({ ok: false, error: "Not found" });
if (fs.statSync(full).isDirectory()) {
return res.status(400).json({ ok: false, error: "Not a file" });
}

fs.unlinkSync(full);
res.json({ ok: true, deleted: file });
} catch (e) {
res.status(500).json({ ok: false, error: e.message });
}
});

// ----- Start -----
app.listen(PORT, "0.0.0.0", () => {
console.log(`✅ HabeshaWeb backend running on :${PORT}`);
console.log(`✅ AUTH_TOKEN set: ${AUTH_TOKEN ? "YES" : "NO"}`);
console.log(`✅ BASE_DIR: ${BASE_DIR}`);
console.log(`✅ CLIENTS_DIR: ${CLIENTS_DIR}`);
});
