const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { signToken } = require("../utils/auth");

const router = express.Router();

router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok: false, message: "Missing credentials" });

  const user = await User.findOne({ username: String(username).toLowerCase().trim() });
  if (!user) return res.status(401).json({ ok: false, message: "Invalid username/password" });
  if (user.status !== "active") return res.status(403).json({ ok: false, message: "User is deactive" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ ok: false, message: "Invalid username/password" });

  const token = signToken(user);

  return res.json({
    ok: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      company: user.company,
    },
  });
});

module.exports = router;