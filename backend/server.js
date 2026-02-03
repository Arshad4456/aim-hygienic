const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, "data");
const regionsFile = path.join(dataDir, "regions.json");

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ✅ health
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "aim-api-demo", time: new Date().toISOString() });
});

// ✅ demo login
app.post("/auth/login", (req, res) => {
  const { username, password } = req.body || {};

  const demoUsers = [
    { id: "u1", username: "admin", password: "Admin@123", role: "admin", fullName: "Admin (AIM Hygienic)" },
    { id: "u2", username: "manager", password: "Manager@123", role: "manager", fullName: "Manager Demo" },
    { id: "u3", username: "sales", password: "Sales@123", role: "salesman", fullName: "Sales Demo" },
  ];

  const u = demoUsers.find((x) => x.username === username && x.password === password);
  if (!u) return res.status(401).json({ message: "Invalid username or password" });

  // simple demo token (later replace with JWT)
  const token = Buffer.from(`${u.id}:${Date.now()}`).toString("base64");

  res.json({
    token,
    user: { id: u.id, username: u.username, role: u.role, fullName: u.fullName },
  });
});

// ✅ regions CRUD (demo JSON DB)
app.get("/regions", (req, res) => {
  const regions = readJson(regionsFile, []);
  res.json(regions);
});

app.post("/regions", (req, res) => {
  const regions = readJson(regionsFile, []);
  const { code, name } = req.body || {};
  if (!code || !name) return res.status(400).json({ message: "code and name required" });

  const newItem = { id: `r_${Date.now()}`, code: String(code).toUpperCase(), name: String(name) };
  regions.unshift(newItem);
  writeJson(regionsFile, regions);
  res.status(201).json(newItem);
});

app.delete("/regions/:id", (req, res) => {
  const regions = readJson(regionsFile, []);
  const next = regions.filter((x) => x.id !== req.params.id);
  writeJson(regionsFile, next);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Demo API running on port", PORT));
