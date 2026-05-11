const express = require('express');
const { requireAuth } = require('../../../platform/auth/utils/auth');
const { requireCompanyModule } = require('../../../platform/access/permissions/companyAccessGuard');
const controller = require('../controllers/operations.controller');
const router = express.Router();
router.use(requireAuth, requireCompanyModule("operations"));
router.get('/overview', controller.overview);
router.get('/customer-portal', controller.customerPortal);
module.exports = router;
