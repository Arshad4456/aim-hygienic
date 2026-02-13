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

function buildLoosePhoneRegex(rawIdentifier) {
  const digits = String(rawIdentifier || "").replace(/\D/g, "");
  if (!digits) return null;

  let local = digits;
  if (local.startsWith("92") && local.length > 2) local = local.slice(2);
  if (local.startsWith("0") && local.length > 1) local = local.slice(1);

  if (!local) return null;
  const tail = local.slice(-10);
  return new RegExp(`${tail}$`);
}

function isUserActive(status) {
  const normalized = String(status || "active").toLowerCase().trim();
  return !normalized || normalized === "active";
}

router.post("/login", async (req, res) => {
  try {
    const { mobile, password, username } = req.body || {};
    const identifier = mobile || username;
    if (!identifier || !password) return res.status(400).json({ ok: false, message: "Missing credentials" });

    const identifiers = buildIdentifierCandidates(identifier);
    let user = await User.findOne({
      $or: [
        { mobile: { $in: identifiers } },
        { mobileNumber: { $in: identifiers } },
        { username: { $in: identifiers } },
        { username: { $in: identifiers.map((value) => value.toLowerCase()) } },
        { phoneNumber: { $in: identifiers } },
      ],
    }).lean();

    if (!user) {
      const loosePhoneRegex = buildLoosePhoneRegex(identifier);
      if (loosePhoneRegex) {
        user = await User.findOne({
          $or: [
            { mobile: { $regex: loosePhoneRegex } },
            { mobileNumber: { $regex: loosePhoneRegex } },
            { phoneNumber: { $regex: loosePhoneRegex } },
          ],
        }).lean();
      }
    }

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
        mobile: user.mobile || user.mobileNumber,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Login failed" });
  }
});

module.exports = router;