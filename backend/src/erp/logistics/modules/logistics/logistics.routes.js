const express = require("express");
const { requireAuth } = require("../../../../utils/auth");
const { requireCompanyModule } = require("../../../../core/access/companyAccessGuard");
const controller = require("./logistics.controller");

const router = express.Router();
router.use(requireAuth, requireCompanyModule("operations"));

router.get("/overview", controller.overview);
router.get("/fleet/overview", controller.overview);
router.get("/deliveries/overview", controller.overview);
router.get("/dispatches/overview", controller.overview);

module.exports = router;
