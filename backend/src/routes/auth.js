const express = require("express");
const User = require("../models/User");
const { signToken } = require("../utils/auth");
const { verifyPassword } = require("../utils/passwordHash");
const { normalizeRoleCode } = require("../access/controlPlane");

const router = express.Router();
const LOGIN_WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 7;
const loginAttempts = new Map();

function getClientIp(req) {
  return req.headers["x-forwarded-for"]?.split(",")?.[0]?.trim() || req.ip || "unknown";
}

function appendAuditLog(event, payload) {
  console.log(`[AUTH_AUDIT] ${event}`, JSON.stringify({ at: new Date().toISOString(), ...payload }));
}

function checkThrottle(key) {
  const current = loginAttempts.get(key);
  if (!current) return false;
  if (Date.now() - current.startedAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return current.count >= MAX_FAILED_ATTEMPTS;
}

function recordFailure(key) {
  const current = loginAttempts.get(key);
  if (!current || Date.now() - current.startedAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, startedAt: Date.now() });
    return;
  }
  current.count += 1;
}

function clearFailures(key) {
  loginAttempts.delete(key);
}

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

    const ip = getClientIp(req);
    const throttleKey = `${String(identifier).toLowerCase().trim()}|${ip}`;
    if (checkThrottle(throttleKey)) {
      appendAuditLog("login.throttled", { identifier, ip });
      return res.status(429).json({ ok: false, message: "Too many failed attempts. Try again later." });
    }

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

    if (!user) {
      recordFailure(throttleKey);
      appendAuditLog("login.failed_user_not_found", { identifier, ip });
      return res.status(401).json({ ok: false, message: "Invalid username/password" });
    }
    if (!isUserActive(user.status)) {
      appendAuditLog("login.blocked_inactive", { userId: user._id?.toString(), identifier, ip });
      return res.status(403).json({ ok: false, message: "User is deactive" });
    }

    const storedPassword = user.passwordHash || user.password;
    const ok = await verifyPassword(password, storedPassword);
    if (!ok) {
      recordFailure(throttleKey);
      appendAuditLog("login.failed_bad_password", { userId: user._id?.toString(), identifier, ip });
      return res.status(401).json({ ok: false, message: "Invalid username/password" });
    }

    clearFailures(throttleKey);

    const token = signToken(user);

    res.cookie("aim_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    appendAuditLog("login.success", { userId: user._id?.toString(), roleCode: normalizeRoleCode(user.role), ip });

    return res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        roleCode: normalizeRoleCode(user.role),
        companyId: user.companyId,
        companyName: user.companyName,
        mobile: user.mobile || user.mobileNumber,
        email: user.email,
        warehouseId: user.warehouseId || "",
      },
    });
  } catch (error) {
    appendAuditLog("login.error", { message: error?.message });
    return res.status(500).json({ ok: false, message: "Login failed" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("aim_token", { path: "/" });
  appendAuditLog("logout", { ip: getClientIp(req) });
  return res.json({ ok: true });
});

module.exports = router;
