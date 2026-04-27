const express = require("express");
const { requireAuth, requireRole } = require("../../utils/auth");
const controller = require("./systemAdmin.controller");

const router = express.Router();
const requireSystemAdmin = [requireAuth, requireRole("admin")];

router.post("/bootstrap-system-admin", controller.bootstrapSystemAdmin);
router.post("/seed-defaults", ...requireSystemAdmin, controller.seedDefaults);
router.get("/overview", ...requireSystemAdmin, controller.overview);
router.get("/companies", ...requireSystemAdmin, controller.companies);
router.get("/companies/:companyId/limits", ...requireSystemAdmin, controller.companyLimits);
router.patch("/companies/:companyId/control", ...requireSystemAdmin, controller.updateCompanyControl);
router.post("/subscription-plans", ...requireSystemAdmin, controller.upsertPlan);
router.post("/users/system-admin", ...requireSystemAdmin, controller.createSystemAdminUser);

module.exports = router;
