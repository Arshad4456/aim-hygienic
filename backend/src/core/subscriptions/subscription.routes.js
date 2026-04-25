const express = require("express");
const CompanySubscription = require("./companySubscription.model");
const { requireAuth, requireRole } = require("../../utils/auth");
const { listPlans, upsertCompanySubscription } = require("./subscription.service");

const router = express.Router();

router.get("/plans", requireAuth, requireRole("admin"), async (_req, res) => {
  try {
    const plans = await listPlans();
    return res.json({ ok: true, plans });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load subscription plans" });
  }
});

router.get("/company/:companyId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const subscription = await CompanySubscription.findOne({ companyId: req.params.companyId }).lean();
    return res.json({ ok: true, subscription });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load company subscription" });
  }
});

router.put("/company/:companyId", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const subscription = await upsertCompanySubscription(req.params.companyId, req.body || {}, req.user?.uid);
    return res.json({ ok: true, subscription });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || "Failed to update company subscription" });
  }
});

module.exports = router;
