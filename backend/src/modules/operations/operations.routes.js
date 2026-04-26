const express = require('express');
const { requireAuth } = require('../../utils/auth');
const controller = require('./operations.controller');
const router = express.Router();
router.use(requireAuth);
router.get('/overview', controller.overview);
router.get('/customer-portal', controller.customerPortal);
module.exports = router;
