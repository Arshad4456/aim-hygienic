const express = require("express");
const { requireAuth } = require("../../../platform/auth/utils/auth");
const { requireCompanyModule } = require("../../../platform/access/permissions/companyAccessGuard");
const controller = require("../controllers/logistics.controller");

const router = express.Router();
router.use(requireAuth, requireCompanyModule("operations"));

router.get("/overview", controller.overview);
router.get("/fleet/overview", controller.overview);
router.get("/deliveries/overview", controller.overview);
router.get("/dispatches/overview", controller.overview);

module.exports = router;
