const { getUserPermissionProfile, hasPermission } = require("./permission.service");

function requirePermission(moduleKey, action = "view") {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ ok: false, message: "Authentication required" });
      const profile = await getUserPermissionProfile(req.user);
      if (!hasPermission(profile.permissions, moduleKey, action)) return res.status(403).json({ ok: false, message: `No ${action} permission for ${moduleKey}` });
      req.permissionProfile = profile;
      next();
    } catch (error) {
      return res.status(500).json({ ok: false, message: "Permission check failed" });
    }
  };
}
module.exports = { requirePermission };
