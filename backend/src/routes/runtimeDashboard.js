const express = require("express");
const { requireAuth } = require("../utils/auth");
const { getRuntimeDashboardDefinitionForUser } = require("../services/runtimeDashboardService");

const router = express.Router();

router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    const dashboard = await getRuntimeDashboardDefinitionForUser(req.user);
    return res.json({ success: true, dashboard });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load runtime dashboard" });
  }
});

module.exports = router;