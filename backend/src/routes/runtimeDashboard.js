const express = require("express");
const { requireAuth } = require("../utils/auth");
const requireActiveCompany = require("../middleware/requireActiveCompany");
const { getRuntimeDashboardDefinitionForUser } = require("../services/runtimeDashboardService");
const { hasRuntimePermission } = require("../services/runtimePermissionService");
const User = require("../models/User");
const Company = require("../models/Company");
const { getCurrentCompanySubscription, syncCompanyLifecycleWithSubscription } = require("../services/subscriptionLifecycleService");

const router = express.Router();

router.get("/dashboard", requireAuth, requireActiveCompany, async (req, res) => {
  try {
    const dashboard = await getRuntimeDashboardDefinitionForUser(req.user);
    return res.json({ success: true, dashboard });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load runtime dashboard" });
  }
});

router.get("/permissions/check", requireAuth, requireActiveCompany, async (req, res) => {
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

router.get("/subscription", requireAuth, async (req, res) => {
  try {
    const authUser = await User.findById(req.user?.uid).lean();
    if (!authUser) return res.status(401).json({ success: false, message: "Authenticated user not found" });

    const company = await Company.findOne({ $or: [{ _id: authUser.companyId }, { companyId: authUser.companyId }, { slug: String(authUser.companyId || "").toLowerCase() }] }).lean();
    if (!company) return res.status(404).json({ success: false, message: "Company not found" });

    const synced = await syncCompanyLifecycleWithSubscription(company._id);
    const current = await getCurrentCompanySubscription(company._id);

    return res.json({
      success: true,
      subscription: {
        companyId: company._id,
        lifecycleStatus: synced?.lifecycleStatus || company.lifecycleStatus,
        planCode: String(current?.planId?.code || "").toLowerCase(),
        planName: current?.planId?.name || "",
        billingCycle: current?.billingCycle || null,
        startDate: current?.startDate || null,
        endDate: current?.endDate || null,
        status: current?.status || null,
        paymentStatus: current?.paymentStatus || null,
        includedModules: current?.planId?.includedModules || [],
        includedFeatures: current?.planId?.includedFeatures || [],
      },
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load runtime subscription" });
  }
});

module.exports = router;
