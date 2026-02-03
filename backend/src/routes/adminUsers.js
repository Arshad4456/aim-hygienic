const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../utils/auth");

const router = express.Router();

// Admin only
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { username, password, fullName, role, mobile, distributor, company } = req.body || {};
  if (!username || !password || !fullName || !role) {
    return res.status(400).json({ ok: false, message: "Missing required fields" });
  }

  const exists = await User.findOne({ username: String(username).toLowerCase().trim() });
  if (exists) return res.status(409).json({ ok: false, message: "Username already exists" });

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await User.create({
    username: String(username).toLowerCase().trim(),
    fullName,
    role,
    mobile: mobile || "",
    distributor: distributor || "",
    company: company || "AIM Hygienic (Pvt) Limited",
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
