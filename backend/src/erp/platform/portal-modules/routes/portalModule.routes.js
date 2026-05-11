const express = require("express");
const { requireAuth } = require("../../auth/utils/auth");
const controller = require("../controllers/portalModule.controller");
const router = express.Router();
router.get("/", requireAuth, controller.list);
router.post("/seed", requireAuth, controller.seed);
router.post("/", requireAuth, controller.upsert);
module.exports = router;
