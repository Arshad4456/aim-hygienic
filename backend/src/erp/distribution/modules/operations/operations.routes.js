const express = require('express');
const { requireAuth } = require('../../../../utils/auth');
const { requireCompanyModule } = require('../../../../core/access/companyAccessGuard');
const controller = require('./operations.controller');
const router = express.Router();
router.use(requireAuth, requireCompanyModule("operations"));
router.get('/overview', controller.overview);
router.get('/customer-portal', controller.customerPortal);
module.exports = router;
