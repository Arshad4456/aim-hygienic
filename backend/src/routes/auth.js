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

    if (digits.startsWith("92") && digits.length > 2) {
      const localWithoutCountry = digits.slice(2);
      candidates.add(localWithoutCountry);
      if (!localWithoutCountry.startsWith("0")) {
        candidates.add(`0${localWithoutCountry}`);
      }
    }

    if (digits.startsWith("0") && digits.length > 1) {
      candidates.add(digits.slice(1));
    }
  }

  return Array.from(candidates).filter(Boolean);
}

function isUserActive(status) {
  const normalized = String(status || "active").toLowerCase().trim();
  return !normalized || normalized === "active";
}

router.post("/login", async (req, res) => {
  const { mobile, password, username } = req.body || {};
  const identifier = mobile || username;
  if (!identifier || !password) return res.status(400).json({ ok: false, message: "Missing credentials" });

  const identifiers = buildIdentifierCandidates(identifier);
  const user = await User.findOne({
    $or: [
      { mobile: { $in: identifiers } },
      { mobileNumber: { $in: identifiers } },
      { username: { $in: identifiers.map((value) => value.toLowerCase()) } },
    ],
  });

  if (!user) return res.status(401).json({ ok: false, message: "Invalid username/password" });
  if (!isUserActive(user.status)) return res.status(403).json({ ok: false, message: "User is deactive" });

  const storedPassword = user.passwordHash || user.password;
  const ok = await verifyPassword(password, storedPassword);
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