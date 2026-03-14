const User = require("../models/User");
const { requireAuth } = require("../utils/auth");
const { isSuperAdminRole, normalizeRoleCode } = require("../config/roleCatalog");

async function requireSuperAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const roleCode = normalizeRoleCode(req.user?.roleCode || req.user?.role);
      if (req.user?.isSuperAdmin === true || isSuperAdminRole(roleCode)) {
        return next();
      }

      if (!req.user?.uid) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }

      const authUser = await User.findById(req.user.uid).select("isSuperAdmin role").lean();
      const authRole = normalizeRoleCode(authUser?.role);
      if (!authUser?.isSuperAdmin && !isSuperAdminRole(authRole)) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }

      req.user.isSuperAdmin = true;
      req.user.roleCode = authRole || req.user.roleCode;
      return next();
    } catch (_error) {
      return res.status(500).json({ ok: false, message: "Authorization check failed" });
    }
  });
}

module.exports = { requireSuperAdmin };
