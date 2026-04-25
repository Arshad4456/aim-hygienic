function hasPermission(user = {}, moduleKey, action = "view") {
  const permissions = user.permissions || user.rolePermissions || {};
  const allowed = permissions[moduleKey] || permissions[String(moduleKey || "").replace(/-/g, "_")] || [];
  return Array.isArray(allowed) && allowed.includes(action);
}
function requirePermission(moduleKey, action = "view") {
  return (req, res, next) => {
    if (hasPermission(req.user || {}, moduleKey, action) || ["admin", "system admin"].includes(String(req.user?.role || "").toLowerCase())) return next();
    return res.status(403).json({ ok: false, message: "Permission denied" });
  };
}
module.exports = { hasPermission, requirePermission };
