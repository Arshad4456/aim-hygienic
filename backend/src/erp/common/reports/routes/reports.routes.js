const express = require('express');
const { requireAuth } = require('../../../platform/auth/utils/auth');
const { requireCompanyModule } = require('../../../platform/access/permissions/companyAccessGuard');
const {
  buildMasterReport,
  buildFocusedReport,
  buildFinanceReport,
  buildLogisticsReport,
  buildProcurementReport,
} = require('../services/reportsMaster');
const { createModuleAccessGuard, normalizeRole: normalizeModuleAccessRole } = require('../../../platform/access/utils/moduleAccess');

const router = express.Router();
router.use(requireAuth, requireCompanyModule("reports"));

const ALLOWED_REPORT_PERIODS = new Set(['all', 'day', 'week', 'month', 'quarter', 'year']);

function reportsModuleKey(req) {
  return normalizeModuleAccessRole(req.user?.role) === 'distributor' ? 'distributor.reports' : 'reports';
}

function normalizeReportPeriod(value) {
  const normalized = String(value || 'month').trim().toLowerCase();
  return ALLOWED_REPORT_PERIODS.has(normalized) ? normalized : 'month';
}

function focusedModuleGuard(req) {
  const moduleKey = String(req.params?.moduleKey || '').trim().toLowerCase();
  return `${reportsModuleKey(req)}.${moduleKey}`;
}

router.get('/master', requireAuth, createModuleAccessGuard((req) => reportsModuleKey(req)), async (req, res) => {
  try {
    const report = await buildMasterReport(req, {
      period: normalizeReportPeriod(req.query?.period),
      companyId: req.query?.companyId || '',
      companyName: req.query?.companyName || '',
    });
    return res.json({ ok: true, ...report });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to build master report' });
  }
});

router.get('/focus/:moduleKey', requireAuth, createModuleAccessGuard((req) => reportsModuleKey(req)), async (req, res) => {
  try {
    const report = await buildFocusedReport(req, req.params.moduleKey, {
      period: normalizeReportPeriod(req.query?.period),
      companyId: req.query?.companyId || '',
      companyName: req.query?.companyName || '',
    });
    return res.json({ ok: true, ...report });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to build focused report' });
  }
});

router.get('/overview', requireAuth, createModuleAccessGuard((req) => reportsModuleKey(req)), async (req, res) => {
  try {
    const report = await buildMasterReport(req, {
      period: normalizeReportPeriod(req.query?.period),
      companyId: req.query?.companyId || '',
      companyName: req.query?.companyName || '',
    });
    return res.json({ ok: true, meta: report.meta, summary: report.summary, modules: report.modules.map((module) => ({
      key: module.key,
      title: module.title,
      description: module.description,
      comparison: module.comparison,
      badge: module.badge,
      kpis: module.kpis,
    })) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to build reports overview' });
  }
});

router.get('/builder', requireAuth, createModuleAccessGuard((req) => reportsModuleKey(req)), async (req, res) => {
  try {
    const report = await buildMasterReport(req, {
      period: normalizeReportPeriod(req.query?.period),
      companyId: req.query?.companyId || '',
      companyName: req.query?.companyName || '',
    });
    return res.json({ ok: true, meta: report.meta, modules: report.modules });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to build reports builder data' });
  }
});

router.get('/sales', requireAuth, createModuleAccessGuard((req) => `${reportsModuleKey(req)}.sales`), async (req, res) => {
  try {
    const report = await buildFocusedReport(req, 'sales', {
      period: normalizeReportPeriod(req.query?.period),
      companyId: req.query?.companyId || '',
      companyName: req.query?.companyName || '',
    });
    return res.json({ ok: true, ...report });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to load sales report' });
  }
});

router.get('/inventory', requireAuth, createModuleAccessGuard((req) => `${reportsModuleKey(req)}.inventory`), async (req, res) => {
  try {
    const report = await buildFocusedReport(req, 'inventory', {
      period: normalizeReportPeriod(req.query?.period),
      companyId: req.query?.companyId || '',
      companyName: req.query?.companyName || '',
    });
    return res.json({ ok: true, ...report });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to load inventory report' });
  }
});

router.get('/finance', requireAuth, createModuleAccessGuard((req) => `${reportsModuleKey(req)}.finance`), async (req, res) => {
  try {
    const report = await buildFinanceReport(req, {
      period: normalizeReportPeriod(req.query?.period),
      companyId: req.query?.companyId || '',
      companyName: req.query?.companyName || '',
    });
    return res.json({ ok: true, ...report });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to load finance report' });
  }
});

router.get('/hr', requireAuth, createModuleAccessGuard((req) => `${reportsModuleKey(req)}.hr`), async (req, res) => {
  try {
    const report = await buildFocusedReport(req, 'hr', {
      period: normalizeReportPeriod(req.query?.period),
      companyId: req.query?.companyId || '',
      companyName: req.query?.companyName || '',
    });
    return res.json({ ok: true, ...report });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to load HR report' });
  }
});

router.get('/logistics', requireAuth, createModuleAccessGuard((req) => `${reportsModuleKey(req)}.logistics`), async (req, res) => {
  try {
    const report = await buildLogisticsReport(req, {
      period: normalizeReportPeriod(req.query?.period),
      companyId: req.query?.companyId || '',
      companyName: req.query?.companyName || '',
    });
    return res.json({ ok: true, ...report });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to load logistics report' });
  }
});

router.get('/compliance', requireAuth, createModuleAccessGuard((req) => `${reportsModuleKey(req)}.compliance`), async (req, res) => {
  try {
    const report = await buildFocusedReport(req, 'compliance', {
      period: normalizeReportPeriod(req.query?.period),
      companyId: req.query?.companyId || '',
      companyName: req.query?.companyName || '',
    });
    return res.json({ ok: true, ...report });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to load compliance report' });
  }
});

router.get('/procurement', requireAuth, createModuleAccessGuard((req) => `${reportsModuleKey(req)}.procurement`), async (req, res) => {
  try {
    const report = await buildProcurementReport(req, {
      period: normalizeReportPeriod(req.query?.period),
      companyId: req.query?.companyId || '',
      companyName: req.query?.companyName || '',
    });
    return res.json({ ok: true, ...report });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to load procurement report' });
  }
});

module.exports = router;
