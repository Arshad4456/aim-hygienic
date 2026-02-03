const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, "data", "data.json");

function readDB() {
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw);
}
function writeDB(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

// Health
app.get("/health", (req, res) => res.json({ ok: true, service: "aim-api-demo", time: new Date().toISOString() }));

// DEMO LOGIN (no JWT yet, simple token)
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const db = readDB();
  const user = db.users.find(u => u.username === username && u.password === password);

  if (!user) return res.status(401).json({ ok: false, message: "Invalid username or password" });
  if (user.status !== "Active") return res.status(403).json({ ok: false, message: "User is De-active" });

  const token = `demo-${user.id}-${Date.now()}`; // demo token
  return res.json({
    ok: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      company: user.company
    }
  });
});

// Dashboard data
app.get("/api/dashboard", (req, res) => {
  const db = readDB();
  res.json({ ok: true, dashboard: db.dashboard });
});

// Sidebar menu
app.get("/api/menu", (req, res) => {
  const db = readDB();
  res.json({ ok: true, menu: db.menu });
});

// Admin: list users (demo)
app.get("/api/admin/users", (req, res) => {
  const db = readDB();
  res.json({ ok: true, users: db.users.map(u => ({ ...u, password: "********" })) });
});

// Admin: create user (demo)
app.post("/api/admin/users", (req, res) => {
  const db = readDB();
  const body = req.body || {};

  if (!body.username || !body.password || !body.role) {
    return res.status(400).json({ ok: false, message: "username, password, role required" });
  }
  if (db.users.some(u => u.username === body.username)) {
    return res.status(409).json({ ok: false, message: "Username already exists" });
  }

  const newUser = {
    id: `u_${Math.random().toString(16).slice(2, 10)}`,
    username: body.username,
    password: body.password,
    role: body.role,
    fullName: body.fullName || body.username,
    company: body.company || "AIM HYGIENIC (PRIVATE) LIMITED",
    status: body.status || "Active"
  };

  db.users.push(newUser);
  writeDB(db);

  res.json({ ok: true, user: { ...newUser, password: "********" } });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Backend running on port", PORT));
