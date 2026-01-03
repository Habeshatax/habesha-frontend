// server.js (FULL FILE - copy/paste)

import express from "express";
import fs from "fs";
import path from "path";
import os from "os";
import cors from "cors";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";

const app = express();

// ----- ESM __dirname fix -----
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----- Middleware -----
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow non-browser tools (no origin)
      if (!origin) return cb(null, true);

      // if no allowlist set, allow all
      if (ALLOWED_ORIGINS.length === 0) return cb(null, true);

      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("CORS blocked for origin: " + origin));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "25mb" }));

// ----- Config -----
const PORT = process.env.PORT || 8787;

// Optional legacy static token support
const AUTH_TOKEN = (process.env.AUTH_TOKEN || "").trim();

// Admin credentials for login
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || "").trim();

// JWT secret for issuing/verifying tokens
const JWT_SECRET = (process.env.JWT_SECRET || "").trim();

/**
 * Storage directory
 * - On Render: attach a Disk and use /var/data/habesha (recommended)
 * - Without a disk: /tmp works but resets on redeploy
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

function getBearer(req) {
  const auth = req.headers.authorization || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return "";
}

function verifyJwtToken(token) {
  if (!JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Protect only /api routes
function requireAuth(req, res, next) {
  // If no auth configured, do not lock yourself out
  if (!AUTH_TOKEN && !JWT_SECRET) return next();

  const token = getBearer(req);

  // 1) Allow old fixed AUTH_TOKEN
  if (AUTH_TOKEN && token === AUTH_TOKEN) return next();

  // 2) Allow JWT
  const payload = verifyJwtToken(token);
  if (payload) {
    req.user = payload;
    return next();
  }

  return res.status(401).json({ ok: false, error: "Unauthorized" });
}

ensureDir(CLIENTS_DIR);

// ----- Health -----
app.get("/health", (req, res) => res.status(200).send("ok"));

app.get("/api/health", (req, res) =>
  res.status(200).json({
    ok: true,
    service: "habeshaweb",
    baseDir: BASE_DIR,
    clientsDir: CLIENTS_DIR,
  })
);

// ----- Home -----
app.get("/", (req, res) => {
  res
    .status(200)
    .send("HabeshaWeb backend is running. Try /health or /api/health");
});

// ----- LOGIN (PUBLIC) -----
// POST /login  body: { email, password }
app.post("/login", (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "").trim();

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return res.status(500).json({
        ok: false,
        error: "ADMIN_EMAIL / ADMIN_PASSWORD not set on server",
      });
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ ok: false, error: "Invalid login" });
    }

    if (!JWT_SECRET) {
      return res.status(500).json({
        ok: false,
        error: "JWT_SECRET not set on server",
      });
    }

    const user = { id: "admin", email: ADMIN_EMAIL, role: "admin" };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });

    return res.json({ ok: true, token, user });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// OPTIONAL (but recommended): who am I? (requires auth header)
app.get("/api/me", requireAuth, (req, res) => {
  // if you used JWT, req.user will exist; if AUTH_TOKEN, req.user may be undefined
  res.json({ ok: true, user: req.user || { id: "legacy", role: "admin" } });
});

// ----- API -----
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
    if (!name) {
      return res
        .status(400)
        .json({ ok: false, error: "Client name required" });
    }

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
    if (!file) {
      return res.status(400).json({ ok: false, error: "file query required" });
    }

    const clientPath = resolveInside(CLIENTS_DIR, client);
    const full = resolveInside(clientPath, file);

    if (!fs.existsSync(full)) {
      return res.status(404).json({ ok: false, error: "Not found" });
    }
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

// Delete file
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
  console.log(`HabeshaWeb backend running on :${PORT}`);
  console.log(`AUTH_TOKEN set: ${AUTH_TOKEN ? "YES" : "NO"}`);
  console.log(`JWT_SECRET set: ${JWT_SECRET ? "YES" : "NO"}`);
  console.log(`ADMIN_EMAIL set: ${ADMIN_EMAIL ? "YES" : "NO"}`);
  console.log(`BASE_DIR: ${BASE_DIR}`);
});
