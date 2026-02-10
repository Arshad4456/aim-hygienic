const express = require("express");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../utils/auth");
const { validatePassword } = require("../utils/password");
const { hashPassword } = require("../utils/passwordHash");

const router = express.Router();

// Admin only
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { username, password, fullName, role, mobile } = req.body || {};
  if (!fullName || !role || !mobile || !password) {
    return res.status(400).json({ ok: false, message: "Missing required fields" });
  }
  const validation = validatePassword(password);
  if (!validation.ok) return res.status(400).json({ ok: false, message: validation.message });

  const exists = await User.findOne({ mobile: String(mobile).trim() });
  if (exists) return res.status(409).json({ ok: false, message: "Mobile already exists" });

  const passwordHash = await hashPassword(password);

  const user = await User.create({
    username: String(username || mobile).toLowerCase().trim(),
    fullName,
    role,
    mobile: String(mobile).trim(),
    status: "active",
    passwordHash,
  });

  res.json({ ok: true, id: user._id });
});

router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
  res.json({ ok: true, users });
});

module.exports = router;