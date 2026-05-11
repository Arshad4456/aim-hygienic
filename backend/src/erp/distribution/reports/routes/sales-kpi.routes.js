const express = require('express');
const { requireAuth } = require('../../../platform/auth/utils/auth');
const { createModuleAccessGuard } = require('../../../platform/access/utils/moduleAccess');
const { buildSalesKpiSummary } = require('../../../common/reports/services/reportsMaster');

const router = express.Router();

router.get('/summary', requireAuth, createModuleAccessGuard('dashboard.sales-kpi'), async (req, res) => {
  try {
    const report = await buildSalesKpiSummary(req, {
      companyId: req.query?.companyId || '',
      companyName: req.query?.companyName || '',
    });
    return res.json(report);
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to load sales KPI' });
  }
});

module.exports = router;
