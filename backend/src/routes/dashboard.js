const express = require('express');
const { requireAuth } = require('../utils/auth');
const { requireCompanyModule } = require('../core/access/companyAccessGuard');
const { createModuleAccessGuard } = require('../utils/moduleAccess');
const { buildDashboardOverview, buildOperationsDashboard, buildFocusedReport } = require('../services/reportsMaster');

const router = express.Router();
router.use(requireAuth, requireCompanyModule("dashboard"));

router.get('/overview', requireAuth, createModuleAccessGuard('dashboard.overview'), async (req, res) => {
  try {
    const report = await buildDashboardOverview(req, {
      companyId: req.query?.companyId || '',
      companyName: req.query?.companyName || '',
    });
    return res.json(report);
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to load dashboard overview' });
  }
});

router.get('/sales-manager', requireAuth, createModuleAccessGuard('dashboard.sales-kpi'), async (req, res) => {
  try {
    const report = await buildFocusedReport(req, 'sales', {
      period: 'month',
      companyId: req.query?.companyId || '',
      companyName: req.query?.companyName || '',
    });

    return res.json({
      ok: true,
      meta: report.meta,
      summary: report.module?.kpis || [],
      alerts: report.module?.alerts || [],
      insights: report.module?.insights || [],
      tables: report.module?.tables || [],
    });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to load sales manager dashboard' });
  }
});

router.get('/operations', requireAuth, createModuleAccessGuard('dashboard.operations'), async (req, res) => {
  try {
    const report = await buildOperationsDashboard(req, {
      companyId: req.query?.companyId || '',
      companyName: req.query?.companyName || '',
    });
    return res.json(report);
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to load operations dashboard' });
  }
});

module.exports = router;
