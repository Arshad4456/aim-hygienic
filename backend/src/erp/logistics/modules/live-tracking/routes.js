const express = require("express");
const { requireAuth } = require("../../../../utils/auth");
const controller = require("./controller");
const {
  validateTrackedActor,
  validateStartDuty,
  validateUpdate,
  validateEndDuty,
  validateUserIdParam,
} = require("./validators");

const router = express.Router();

router.post("/start-duty", requireAuth, validateTrackedActor, validateStartDuty, controller.startDuty);
router.post("/update", requireAuth, validateTrackedActor, validateUpdate, controller.update);
router.post("/end-duty", requireAuth, validateTrackedActor, validateEndDuty, controller.endDuty);
router.get("/live-users", requireAuth, controller.liveUsers);
router.get("/live-user/:userId", requireAuth, validateUserIdParam, controller.liveUser);
router.get("/history/:userId", requireAuth, validateUserIdParam, controller.history);
router.get("/duty-sessions/:userId", requireAuth, validateUserIdParam, controller.dutySessions);
router.get("/summary/:userId", requireAuth, validateUserIdParam, controller.summary);

module.exports = router;