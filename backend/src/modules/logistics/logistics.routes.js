const express = require("express");
const { requireAuth } = require("../../utils/auth");
const controller = require("./logistics.controller");

const router = express.Router();
router.use(requireAuth);

router.get("/overview", controller.overview);
router.get("/fleet/overview", controller.overview);
router.get("/deliveries/overview", controller.overview);
router.get("/dispatches/overview", controller.overview);

module.exports = router;
