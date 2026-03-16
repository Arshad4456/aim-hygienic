const express = require("express");
const Company = require("../../models/Company");
const CompanySettings = require("../../models/CompanySettings");
const HierarchyTemplate = require("../../models/HierarchyTemplate");
const RoleTemplate = require("../../models/RoleTemplate");
const ModuleTemplate = require("../../models/ModuleTemplate");
const CompanyOnboardingState = require("../../models/CompanyOnboardingState");
const CompanyDocumentTemplate = require("../../models/CompanyDocumentTemplate");
const { assignHierarchyToCompany, getCompanyHierarchy } = require("../../services/companyHierarchyService");
const { assignRolesToCompany, getCompanyRoles, getAvailableRoleTemplatesForCompany } = require("../../services/companyRoleService");
const { generateDashboardsForCompany, getCompanyDashboards, getCompanyDashboardByRole } = require("../../services/companyDashboardService");
const { assignModulesToRoleDashboard, getRoleDashboardModules } = require("../../services/companyRoleModuleService");
const { assignPermissionsToRoleModule, getRoleModulePermissions } = require("../../services/companyRoleModulePermissionService");
const { getRuntimeDashboardDefinition } = require("../../services/runtimeDashboardService");
const { logCompanyCreated, logHierarchyAssigned, logRolesAssigned, logDashboardsGenerated, logModulesAssigned, logPermissionsUpdated } = require("../../services/platformAuditLogService");
const { buildAuditContext, fireAndForgetAudit, ensureCompanyOrThrow, slugify, generateUniqueCompanySlug, ensurePlatformSeedData } = require("./common");

const router = express.Router();

function pickCompanyFields(body = {}) {
  return {
    name: String(body.name || '').trim(),
    status: body.status || 'active',
    logoUrl: String(body.logoUrl || '').trim(),
    primaryColor: String(body.primaryColor || '#10b981').trim(),
    address: String(body.address || '').trim(),
    phone: String(body.phone || '').trim(),
    email: String(body.email || '').trim(),
  };
}

async function buildCompanySummary(companyDoc) {
  const company = companyDoc.toObject ? companyDoc.toObject() : companyDoc;
  const [settings, onboarding, hierarchy, roles, docs] = await Promise.all([
    CompanySettings.findOne({ companyId: company._id }).lean(),
    CompanyOnboardingState.findOne({ companyId: company._id }).lean(),
    getCompanyHierarchy(company._id).catch(() => null),
    getCompanyRoles(company._id).catch(() => []),
    CompanyDocumentTemplate.countDocuments({ companyId: company._id }),
  ]);
  return {
    ...company,
    settings,
    onboardingState: onboarding,
    hierarchy,
    roleCount: roles.length,
    documentTemplateCount: docs,
  };
}

router.post('/companies', async (req, res) => {
  try {
    await ensurePlatformSeedData();
    const body = req.body || {};
    const companyFields = pickCompanyFields(body);
    if (!companyFields.name) return res.status(400).json({ ok: false, message: 'Company name is required' });
    const requestedSlug = slugify(body.slug || companyFields.name);
    const uniqueSlug = await generateUniqueCompanySlug(requestedSlug || companyFields.name);
    const company = await Company.create({
      ...companyFields,
      slug: uniqueSlug,
      createdBy: req.user?.uid || req.user?._id,
      lifecycleStatus: body.status === 'active' ? 'active' : 'inactive',
      onboardingStatus: 'not_started',
    });
    const settings = await CompanySettings.create({
      companyId: company._id,
      appName: String(body.appName || companyFields.name).trim(),
      logoUrl: companyFields.logoUrl,
      primaryColor: companyFields.primaryColor,
      invoiceHeader: String(body.invoiceHeader || '').trim(),
      invoiceFooter: String(body.invoiceFooter || '').trim(),
      receiptHeader: String(body.receiptHeader || '').trim(),
      receiptFooter: String(body.receiptFooter || '').trim(),
      modules: body.modules && typeof body.modules === 'object' ? body.modules : {},
    });
    await CompanyOnboardingState.findOneAndUpdate(
      { companyId: company._id },
      { companyId: company._id, currentStep: 2, steps: { companyCreated: true, settingsConfigured: true, hierarchyAssigned: false, rolesAssigned: false, dashboardsGenerated: false, modulesAssigned: false, permissionsConfigured: false, documentTemplatesConfigured: false, setupCompleted: false }, startedBy: req.user?.uid || req.user?._id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    fireAndForgetAudit(logCompanyCreated(buildAuditContext(req), company));
    return res.status(201).json({ ok: true, company: await buildCompanySummary(company), settings, generatedSlug: uniqueSlug });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to create company' });
  }
});

router.get('/companies', async (_req, res) => {
  try {
    await ensurePlatformSeedData();
    const companies = await Company.find().sort({ createdAt: -1 });
    const enriched = [];
    for (const company of companies) enriched.push(await buildCompanySummary(company));
    return res.json({ ok: true, companies: enriched });
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Failed to load companies' });
  }
});

router.get('/companies/:id', async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ ok: false, message: 'Company not found' });
    return res.json({ ok: true, company: await buildCompanySummary(company) });
  } catch (error) {
    return res.status(400).json({ ok: false, message: 'Invalid company id' });
  }
});

router.put('/companies/:id', async (req, res) => {
  try {
    const body = req.body || {};
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ ok: false, message: 'Company not found' });
    const updates = pickCompanyFields(body);
    if (body.slug !== undefined) {
      const desired = slugify(body.slug || body.name || company.name);
      updates.slug = desired && desired !== company.slug ? await generateUniqueCompanySlug(desired) : company.slug;
    }
    Object.assign(company, updates);
    await company.save();
    if (body.appName || body.logoUrl || body.primaryColor || body.invoiceHeader !== undefined || body.invoiceFooter !== undefined || body.receiptHeader !== undefined || body.receiptFooter !== undefined) {
      await CompanySettings.findOneAndUpdate(
        { companyId: company._id },
        {
          companyId: company._id,
          appName: String(body.appName || company.name).trim(),
          logoUrl: String(body.logoUrl || company.logoUrl || '').trim(),
          primaryColor: String(body.primaryColor || company.primaryColor || '#10b981').trim(),
          invoiceHeader: String(body.invoiceHeader || '').trim(),
          invoiceFooter: String(body.invoiceFooter || '').trim(),
          receiptHeader: String(body.receiptHeader || '').trim(),
          receiptFooter: String(body.receiptFooter || '').trim(),
          modules: body.modules && typeof body.modules === 'object' ? body.modules : undefined,
        },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      );
    }
    return res.json({ ok: true, company: await buildCompanySummary(company) });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || 'Failed to update company' });
  }
});

router.get('/companies/:id/settings', async (req, res) => {
  try {
    await ensureCompanyOrThrow(req.params.id);
    const settings = await CompanySettings.findOne({ companyId: req.params.id }).lean();
    return res.json({ ok: true, settings: settings || null });
  } catch (error) {
    return res.status(error.status || 500).json({ ok: false, message: error.message || 'Failed to load settings' });
  }
});

router.put('/companies/:id/settings', async (req, res) => {
  try {
    await ensureCompanyOrThrow(req.params.id);
    const body = req.body || {};
    const settings = await CompanySettings.findOneAndUpdate(
      { companyId: req.params.id },
      {
        companyId: req.params.id,
        appName: String(body.appName || '').trim(),
        logoUrl: String(body.logoUrl || '').trim(),
        primaryColor: String(body.primaryColor || '#10b981').trim(),
        invoiceHeader: String(body.invoiceHeader || '').trim(),
        invoiceFooter: String(body.invoiceFooter || '').trim(),
        receiptHeader: String(body.receiptHeader || '').trim(),
        receiptFooter: String(body.receiptFooter || '').trim(),
        modules: body.modules && typeof body.modules === 'object' ? body.modules : {},
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.json({ ok: true, settings });
  } catch (error) {
    return res.status(error.status || 500).json({ ok: false, message: error.message || 'Failed to save settings' });
  }
});

router.post('/hierarchy-templates', async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const code = String(body.code || '').trim().toLowerCase();
    const levels = Array.isArray(body.levels) ? body.levels : [];
    if (!name || !code || !levels.length) return res.status(400).json({ ok: false, message: 'name, code and levels are required' });
    const template = await HierarchyTemplate.create({ name, code, description: String(body.description || '').trim(), levels, isActive: body.isActive !== false });
    return res.status(201).json({ ok: true, template });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ ok: false, message: 'Hierarchy template code already exists' });
    return res.status(500).json({ ok: false, message: error.message || 'Failed to create hierarchy template' });
  }
});
router.get('/hierarchy-templates', async (_req, res) => { await ensurePlatformSeedData(); return res.json({ ok: true, templates: await HierarchyTemplate.find().sort({ name: 1 }).lean() }); });

router.post('/role-templates', async (req, res) => {
  try {
    const body = req.body || {};
    const template = await RoleTemplate.create({
      name: String(body.name || '').trim(), code: String(body.code || '').trim().toLowerCase(), description: String(body.description || '').trim(),
      applicableHierarchyCodes: Array.isArray(body.applicableHierarchyCodes) ? body.applicableHierarchyCodes.map((v) => String(v).trim().toLowerCase()) : [],
      isMandatory: Boolean(body.isMandatory), isActive: body.isActive !== false,
    });
    return res.status(201).json({ ok: true, template });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ ok: false, message: 'Role template code already exists' });
    return res.status(500).json({ ok: false, message: error.message || 'Failed to create role template' });
  }
});
router.get('/role-templates', async (_req, res) => { await ensurePlatformSeedData(); return res.json({ ok: true, templates: await RoleTemplate.find().sort({ isMandatory: -1, name: 1 }).lean() }); });

router.post('/module-templates', async (req, res) => {
  try {
    const body = req.body || {};
    const template = await ModuleTemplate.create({
      name: String(body.name || '').trim(), code: String(body.code || '').trim().toLowerCase(), description: String(body.description || '').trim(), category: String(body.category || 'general').trim().toLowerCase(),
      types: Array.isArray(body.types) ? body.types : [], subtypes: Array.isArray(body.subtypes) ? body.subtypes : [], sections: Array.isArray(body.sections) ? body.sections : [],
      supportedActions: Array.isArray(body.supportedActions) ? body.supportedActions : [], isActive: body.isActive !== false,
    });
    return res.status(201).json({ ok: true, template });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ ok: false, message: 'Module template code already exists' });
    return res.status(500).json({ ok: false, message: error.message || 'Failed to create module template' });
  }
});
router.get('/module-templates', async (_req, res) => { await ensurePlatformSeedData(); return res.json({ ok: true, templates: await ModuleTemplate.find().sort({ category: 1, name: 1 }).lean() }); });
router.get('/module-templates/:id', async (req, res) => {
  const template = await ModuleTemplate.findById(req.params.id).lean();
  if (!template) return res.status(404).json({ ok: false, message: 'Module template not found' });
  return res.json({ ok: true, template });
});
router.get('/module-templates/:moduleCode/actions', async (req, res) => {
  const template = await ModuleTemplate.findOne({ code: String(req.params.moduleCode || '').trim().toLowerCase() }).lean();
  if (!template) return res.status(404).json({ ok: false, message: 'Module template not found' });
  return res.json({ success: true, module: { code: template.code, name: template.name, supportedActions: template.supportedActions || [], sections: template.sections || [] } });
});

router.post('/companies/:companyId/hierarchy', async (req, res) => {
  try {
    const result = await assignHierarchyToCompany(req.params.companyId, req.body?.hierarchyTemplateId, req.user?.uid || req.user?._id);
    fireAndForgetAudit(logHierarchyAssigned(buildAuditContext(req), result.company, result.hierarchyConfig));
    return res.json({ success: true, company: { _id: result.company._id, name: result.company.name, activeHierarchyCode: result.company.activeHierarchyCode, activeHierarchyConfigId: result.company.activeHierarchyConfigId }, hierarchyConfig: result.hierarchyConfig });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to assign hierarchy' });
  }
});
router.get('/companies/:companyId/hierarchy', async (req, res) => { try { return res.json({ success: true, hierarchyConfig: await getCompanyHierarchy(req.params.companyId) }); }
  catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to load hierarchy' }); } });
router.post('/companies/:companyId/roles', async (req, res) => {
  try {
    const result = await assignRolesToCompany(req.params.companyId, req.body?.roleTemplateIds, req.user?.uid || req.user?._id);
    fireAndForgetAudit(logRolesAssigned(buildAuditContext(req), result.company, result.roles));
    return res.json({ success: true, company: { _id: result.company._id, name: result.company.name, activeHierarchyCode: result.company.activeHierarchyCode, activeRoleCodes: result.company.activeRoleCodes, hasRoleConfiguration: result.company.hasRoleConfiguration }, roles: result.roles });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to assign roles' });
  }
});
router.get('/companies/:companyId/roles', async (req, res) => { try { return res.json({ success: true, roles: await getCompanyRoles(req.params.companyId) }); } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to load roles' }); } });
router.get('/companies/:companyId/available-role-templates', async (req, res) => { try { return res.json({ success: true, templates: await getAvailableRoleTemplatesForCompany(req.params.companyId) }); } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to load available role templates' }); } });
router.post('/companies/:companyId/generate-dashboards', async (req, res) => {
  try {
    const result = await generateDashboardsForCompany(req.params.companyId, req.user?.uid || req.user?._id);
    fireAndForgetAudit(logDashboardsGenerated(buildAuditContext(req), result.company, result.dashboards));
    return res.json({ success: true, company: { _id: result.company._id, name: result.company.name, hasDashboardConfiguration: result.company.hasDashboardConfiguration }, dashboards: result.dashboards });
  } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to generate dashboards' }); }
});
router.get('/companies/:companyId/dashboards', async (req, res) => { try { return res.json({ success: true, dashboards: await getCompanyDashboards(req.params.companyId) }); } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to load dashboards' }); } });
router.get('/companies/:companyId/dashboards/:roleCode', async (req, res) => { try { return res.json({ success: true, dashboard: await getCompanyDashboardByRole(req.params.companyId, req.params.roleCode) }); } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to load dashboard' }); } });
router.post('/companies/:companyId/dashboards/:roleCode/modules', async (req, res) => {
  try {
    const result = await assignModulesToRoleDashboard(req.params.companyId, req.params.roleCode, req.body?.modules, req.user?.uid || req.user?._id);
    fireAndForgetAudit(logModulesAssigned(buildAuditContext(req), { _id: req.params.companyId }, req.params.roleCode, result.modules));
    return res.json({ success: true, dashboard: result.dashboard, modules: result.modules });
  } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to assign modules' }); }
});
router.get('/companies/:companyId/dashboards/:roleCode/modules', async (req, res) => { try { return res.json({ success: true, modules: await getRoleDashboardModules(req.params.companyId, req.params.roleCode) }); } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to load modules' }); } });
router.get('/companies/:companyId/available-modules', async (_req, res) => { await ensurePlatformSeedData(); return res.json({ success: true, templates: await ModuleTemplate.find({ isActive: true }).sort({ category: 1, name: 1 }).lean() }); });
router.post('/companies/:companyId/dashboards/:roleCode/modules/:moduleCode/permissions', async (req, res) => {
  try {
    const permission = await assignPermissionsToRoleModule(req.params.companyId, req.params.roleCode, req.params.moduleCode, req.body || {}, req.user?.uid || req.user?._id);
    fireAndForgetAudit(logPermissionsUpdated(buildAuditContext(req), { _id: req.params.companyId }, req.params.roleCode, req.params.moduleCode, permission));
    return res.json({ success: true, permission });
  } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to save permissions' }); }
});
router.get('/companies/:companyId/dashboards/:roleCode/modules/:moduleCode/permissions', async (req, res) => { try { return res.json({ success: true, permission: await getRoleModulePermissions(req.params.companyId, req.params.roleCode, req.params.moduleCode) }); } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to load permissions' }); } });
router.get('/companies/:companyId/dashboards/:roleCode/runtime', async (req, res) => { try { return res.json({ success: true, dashboard: await getRuntimeDashboardDefinition(req.params.companyId, req.params.roleCode) }); } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to load runtime dashboard' }); } });
router.get('/companies/:companyId/runtime-dashboards', async (req, res) => {
  try {
    const roles = await getCompanyRoles(req.params.companyId);
    const dashboards = [];
    for (const role of roles.filter((item) => item.isActive)) dashboards.push(await getRuntimeDashboardDefinition(req.params.companyId, role.roleCode));
    return res.json({ success: true, dashboards });
  } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to load runtime dashboards' }); }
});

module.exports = router;
