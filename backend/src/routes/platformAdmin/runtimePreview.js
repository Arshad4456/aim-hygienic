const express = require("express");
const Company = require("../../models/Company");
const { requireSuperAdmin } = require("../../middleware/requireSuperAdmin");
const { getRuntimeDashboardDefinition } = require("../../services/runtimeDashboardService");

const router = express.Router();
router.use(requireSuperAdmin);

router.get("/companies/:companyId/runtime-preview/:roleCode", async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId).select("_id name slug status").lean();
    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const dashboard = await getRuntimeDashboardDefinition(String(company._id), req.params.roleCode);
    return res.json({ success: true, mode: 'preview', company, roleCode: req.params.roleCode, dashboard });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to load runtime preview' });
  }
});

module.exports = router;
