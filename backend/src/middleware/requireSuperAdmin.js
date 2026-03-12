const User = require("../models/User");
const { requireAuth } = require("../utils/auth");

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function isSuperAdminRole(role) {
  const normalized = normalizeRole(role);
  return normalized === "super admin" || normalized === "superadmin";
}

async function requireSuperAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      if (req.user?.isSuperAdmin === true || isSuperAdminRole(req.user?.role)) {
        return next();
      }

      if (!req.user?.uid) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }

      const authUser = await User.findById(req.user.uid).select("isSuperAdmin role").lean();
      if (!authUser?.isSuperAdmin && !isSuperAdminRole(authUser?.role)) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }

      req.user.isSuperAdmin = true;
      return next();
    } catch (_error) {
      return res.status(500).json({ ok: false, message: "Authorization check failed" });
    }
  });
}

module.exports = { requireSuperAdmin };