const express = require("express");
const User = require("../models/User");
const { signToken } = require("../utils/auth");
const { verifyPassword } = require("../utils/passwordHash");

const router = express.Router();

function buildIdentifierCandidates(rawIdentifier) {
  const value = String(rawIdentifier || "").trim();
  if (!value) return [];

  const candidates = new Set([value, value.toLowerCase()]);
  const digits = value.replace(/\D/g, "");

  if (digits) {
    candidates.add(digits);
    if (digits.startsWith("92") && digits.length > 10) {
      candidates.add(digits.slice(2));
      candidates.add(`0${digits.slice(2)}`);
    }
    if (digits.startsWith("0") && digits.length > 10) {
      candidates.add(digits.slice(1));
    }
  }

  return Array.from(candidates).filter(Boolean);
}

router.post("/login", async (req, res) => {
  const { mobile, password, username } = req.body || {};
  const identifier = mobile || username;
  if (!identifier || !password) return res.status(400).json({ ok: false, message: "Missing credentials" });

  const identifiers = buildIdentifierCandidates(identifier);
  const user = await User.findOne({
    $or: [
      { mobile: { $in: identifiers } },
      { username: { $in: identifiers.map((value) => value.toLowerCase()) } },
    ],
  });

  if (!user) return res.status(401).json({ ok: false, message: "Invalid username/password" });
  if (user.status !== "active") return res.status(403).json({ ok: false, message: "User is deactive" });

  const ok = await verifyPassword(password, user.passwordHash);
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
      companyId: user.companyId,
      companyName: user.companyName,
      mobile: user.mobile,
      email: user.email,
    },
  });
});

module.exports = router;
