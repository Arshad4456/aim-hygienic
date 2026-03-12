const express = require("express");
const { requireAuth } = require("../utils/auth");
const { getRuntimeDashboardDefinitionForUser } = require("../services/runtimeDashboardService");
const { hasRuntimePermission } = require("../services/runtimePermissionService");

const router = express.Router();

router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const dashboard = await getRuntimeDashboardDefinitionForUser(req.user);
    return res.json({ success: true, dashboard });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load runtime dashboard" });
  }
});

router.get("/permissions/check", requireAuth, async (req, res) => {
  try {
    const { moduleCode, action, sectionCode } = req.query;
    const permission = await hasRuntimePermission(req.user, moduleCode, action, sectionCode);

    return res.json({
      success: true,
      moduleCode: String(moduleCode || "").trim().toLowerCase(),
      action: String(action || "").trim().toLowerCase(),
      sectionCode: String(sectionCode || "").trim().toLowerCase() || null,
      ...permission,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to evaluate runtime permission",
    });
  }
});

module.exports = router;
