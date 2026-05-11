const express = require("express");
const { requireAuth } = require("../../auth/utils/auth");
const controller = require("../controllers/settings.controller");

const router = express.Router();

router.get("/", requireAuth, controller.getSettings);
router.put("/", requireAuth, controller.updateSettings);
router.patch("/:section", requireAuth, controller.updateSection);

module.exports = router;
