const express = require("express");
const { requireSuperAdmin } = require("../../middleware/requireSuperAdmin");
const runtimePreviewRouter = require("./runtimePreview");
const companiesRouter = require("./companies");
const templatesRouter = require("./templates");
const onboardingRouter = require("./onboarding");
const subscriptionsRouter = require("./subscriptions");
const analyticsRouter = require("./analytics");
const auditLogsRouter = require("./auditLogs");
const configSnapshotsRouter = require("./configSnapshots");

const router = express.Router();
router.use(requireSuperAdmin);
router.use(runtimePreviewRouter);
router.use(companiesRouter);
router.use(templatesRouter);
router.use(onboardingRouter);
router.use(subscriptionsRouter);
router.use(analyticsRouter);
router.use(auditLogsRouter);
router.use(configSnapshotsRouter);

module.exports = router;
