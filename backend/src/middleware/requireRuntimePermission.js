const { hasRuntimePermission } = require("../services/runtimePermissionService");

function requireRuntimePermission(moduleCode, action, sectionCodeResolver) {
  return async (req, res, next) => {
    try {
      const sectionCode = typeof sectionCodeResolver === "function" ? sectionCodeResolver(req) : undefined;
      const result = await hasRuntimePermission(req.user, moduleCode, action, sectionCode);

      if (!result.allowed) {
        return res.status(403).json({
          success: false,
          message: "Forbidden",
          reason: result.reason,
        });
      }

      return next();
    } catch (error) {
      return res.status(error.status || 500).json({
        success: false,
        message: error.message || "Failed to evaluate runtime permissions",
      });
    }
  };
}

module.exports = {
  requireRuntimePermission,
};
