const Company = require("../models/Company");
const CompanySettings = require("../models/CompanySettings");
const CompanyHierarchyConfig = require("../models/CompanyHierarchyConfig");
const CompanyRoleConfig = require("../models/CompanyRoleConfig");
const CompanyDashboardConfig = require("../models/CompanyDashboardConfig");
const CompanyRoleModuleConfig = require("../models/CompanyRoleModuleConfig");
const CompanyRoleModulePermission = require("../models/CompanyRoleModulePermission");
const CompanyDocumentTemplate = require("../models/CompanyDocumentTemplate");
const CompanyOnboardingState = require("../models/CompanyOnboardingState");
const CompanySetupTemplate = require("../models/CompanySetupTemplate");

function normalizeCode(value) {
  return String(value || "").trim().toLowerCase();
}

async function ensureCompany(companyId) {
  const company = await Company.findById(companyId).lean();
  if (!company) {
    const error = new Error("Company not found");
    error.status = 404;
    throw error;
  }
  return company;
}

function pickSettings(settings) {
  if (!settings) return null;
  return {
    appName: settings.appName || "",
    logoUrl: settings.logoUrl || "",
    primaryColor: settings.primaryColor || "",
    invoiceHeader: settings.invoiceHeader || "",
    invoiceFooter: settings.invoiceFooter || "",
    receiptHeader: settings.receiptHeader || "",
    receiptFooter: settings.receiptFooter || "",
    modules: settings.modules && typeof settings.modules === "object" ? settings.modules : {},
  };
}

function buildAppliedFlags({ applySettings, applyDocuments }) {
  return {
    settings: Boolean(applySettings),
    hierarchy: true,
    roles: true,
    dashboards: true,
    modules: true,
    permissions: true,
    documentTemplates: Boolean(applyDocuments),
  };
}

async function extractCompanySetupTemplateData(companyId) {
  await ensureCompany(companyId);

  const [settings, hierarchy, roles, dashboards, modules, permissions, documentTemplates] = await Promise.all([
    CompanySettings.findOne({ companyId }).lean(),
    CompanyHierarchyConfig.findOne({ companyId, isActive: true }).lean(),
    CompanyRoleConfig.find({ companyId, isActive: true }).sort({ roleName: 1 }).lean(),
    CompanyDashboardConfig.find({ companyId, isActive: true }).sort({ roleCode: 1 }).lean(),
    CompanyRoleModuleConfig.find({ companyId, isActive: true }).sort({ roleCode: 1, sidebarOrder: 1 }).lean(),
    CompanyRoleModulePermission.find({ companyId, isActive: true }).sort({ roleCode: 1, moduleCode: 1 }).lean(),
    CompanyDocumentTemplate.find({ companyId, isActive: true }).sort({ documentType: 1, isDefault: -1, createdAt: -1 }).lean(),
  ]);

  return {
    settings: pickSettings(settings),
    hierarchy: hierarchy
      ? {
          hierarchyTemplateId: hierarchy.hierarchyTemplateId,
          hierarchyCode: hierarchy.hierarchyCode,
          hierarchyName: hierarchy.hierarchyName,
          levels: hierarchy.levels || [],
        }
      : null,
    roles: roles.map((role) => ({
      roleTemplateId: role.roleTemplateId,
      roleCode: role.roleCode,
      roleName: role.roleName,
      hierarchyCode: role.hierarchyCode,
      isMandatory: Boolean(role.isMandatory),
      isActive: role.isActive !== false,
    })),
    dashboards: dashboards.map((dashboard) => ({
      roleCode: dashboard.roleCode,
      roleName: dashboard.roleName,
      dashboardTitle: dashboard.dashboardTitle,
      dashboardCode: dashboard.dashboardCode,
      shellConfig: dashboard.shellConfig || {},
      sharedFeatures: dashboard.sharedFeatures || [],
      sidebarItems: dashboard.sidebarItems || [],
      isActive: dashboard.isActive !== false,
    })),
    modules: modules.map((moduleItem) => ({
      roleCode: moduleItem.roleCode,
      moduleTemplateId: moduleItem.moduleTemplateId,
      moduleCode: moduleItem.moduleCode,
      moduleName: moduleItem.moduleName,
      moduleType: moduleItem.moduleType,
      selectedSubtypes: moduleItem.selectedSubtypes || [],
      selectedSections: moduleItem.selectedSections || [],
      sidebarLabel: moduleItem.sidebarLabel,
      sidebarPath: moduleItem.sidebarPath,
      sidebarOrder: moduleItem.sidebarOrder,
      isActive: moduleItem.isActive !== false,
    })),
    permissions: permissions.map((permission) => ({
      roleCode: permission.roleCode,
      moduleCode: permission.moduleCode,
      allowedActions: permission.allowedActions || [],
      sectionPermissions: permission.sectionPermissions || [],
      isActive: permission.isActive !== false,
    })),
    documentTemplates: documentTemplates.map((template) => ({
      documentType: template.documentType,
      templateCode: template.templateCode,
      templateName: template.templateName,
      description: template.description || "",
      layoutVariant: template.layoutVariant || "standard",
      styleConfig: template.styleConfig || {},
      headerConfig: template.headerConfig || {},
      footerConfig: template.footerConfig || {},
      isDefault: Boolean(template.isDefault),
      isActive: template.isActive !== false,
    })),
  };
}

async function createSetupTemplateFromCompany(companyId, payload, userId) {
  await ensureCompany(companyId);

  const name = String(payload?.name || "").trim();
  const code = normalizeCode(payload?.code);

  if (!name || !code) {
    const error = new Error("name and code are required");
    error.status = 400;
    throw error;
  }

  const templateData = await extractCompanySetupTemplateData(companyId);

  let template;
  try {
    template = await CompanySetupTemplate.create({
      name,
      code,
      description: String(payload?.description || "").trim(),
      category: normalizeCode(payload?.category) || "general",
      sourceCompanyId: companyId,
      templateData,
      isActive: payload?.isActive !== undefined ? Boolean(payload.isActive) : true,
      createdBy: userId || undefined,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const conflict = new Error("Template code already exists");
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }

  return template.toObject();
}

async function hasExistingSetup(companyId) {
  const [hierarchy, roles, dashboards, modules, permissions, documents] = await Promise.all([
    CompanyHierarchyConfig.countDocuments({ companyId, isActive: true }),
    CompanyRoleConfig.countDocuments({ companyId, isActive: true }),
    CompanyDashboardConfig.countDocuments({ companyId, isActive: true }),
    CompanyRoleModuleConfig.countDocuments({ companyId, isActive: true }),
    CompanyRoleModulePermission.countDocuments({ companyId, isActive: true }),
    CompanyDocumentTemplate.countDocuments({ companyId, isActive: true }),
  ]);

  return hierarchy + roles + dashboards + modules + permissions + documents > 0;
}

async function clearExistingSetup(companyId) {
  await Promise.all([
    CompanyHierarchyConfig.deleteMany({ companyId }),
    CompanyRoleConfig.deleteMany({ companyId }),
    CompanyDashboardConfig.deleteMany({ companyId }),
    CompanyRoleModuleConfig.deleteMany({ companyId }),
    CompanyRoleModulePermission.deleteMany({ companyId }),
    CompanyDocumentTemplate.deleteMany({ companyId }),
  ]);
}

async function upsertOnboardingStateForAppliedSetup(companyId, userId, options = {}) {
  const settingsConfigured = Boolean(options.settingsApplied);
  const documentTemplatesConfigured = Boolean(options.documentsApplied);

  await CompanyOnboardingState.findOneAndUpdate(
    { companyId },
    {
      $setOnInsert: {
        companyId,
        startedBy: userId || undefined,
      },
      $set: {
        currentStep: 9,
        "steps.companyCreated": true,
        "steps.settingsConfigured": settingsConfigured,
        "steps.hierarchyAssigned": true,
        "steps.rolesAssigned": true,
        "steps.dashboardsGenerated": true,
        "steps.modulesAssigned": true,
        "steps.permissionsConfigured": true,
        "steps.documentTemplatesConfigured": documentTemplatesConfigured,
        "steps.setupCompleted": false,
        completedBy: null,
        completedAt: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await Company.findByIdAndUpdate(companyId, {
    $set: {
      onboardingStatus: "in_progress",
      setupCompletedAt: null,
    },
  });
}

async function applyTemplateDataToCompany(targetCompanyId, templateData, options, userId) {
  const applySettings = options.cloneBranding !== false;
  const applyDocuments = options.cloneDocuments !== false;

  if (applySettings && templateData.settings) {
    await CompanySettings.findOneAndUpdate(
      { companyId: targetCompanyId },
      {
        $set: {
          appName: String(templateData.settings.appName || "").trim(),
          logoUrl: String(templateData.settings.logoUrl || "").trim(),
          primaryColor: String(templateData.settings.primaryColor || "").trim(),
          invoiceHeader: String(templateData.settings.invoiceHeader || "").trim(),
          invoiceFooter: String(templateData.settings.invoiceFooter || "").trim(),
          receiptHeader: String(templateData.settings.receiptHeader || "").trim(),
          receiptFooter: String(templateData.settings.receiptFooter || "").trim(),
          modules: templateData.settings.modules && typeof templateData.settings.modules === "object" ? templateData.settings.modules : {},
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    await Company.findByIdAndUpdate(targetCompanyId, {
      $set: {
        logoUrl: String(templateData.settings.logoUrl || "").trim(),
        primaryColor: String(templateData.settings.primaryColor || "").trim(),
      },
    });
  }

  if (!templateData.hierarchy || !templateData.hierarchy.hierarchyTemplateId) {
    const error = new Error("Template hierarchy configuration is missing");
    error.status = 400;
    throw error;
  }

  await CompanyHierarchyConfig.create({
    companyId: targetCompanyId,
    hierarchyTemplateId: templateData.hierarchy.hierarchyTemplateId,
    hierarchyCode: normalizeCode(templateData.hierarchy.hierarchyCode),
    hierarchyName: templateData.hierarchy.hierarchyName,
    levels: Array.isArray(templateData.hierarchy.levels) ? templateData.hierarchy.levels : [],
    isActive: true,
    createdBy: userId || undefined,
  });

  const roleByCode = new Map();
  for (const role of Array.isArray(templateData.roles) ? templateData.roles : []) {
    const createdRole = await CompanyRoleConfig.create({
      companyId: targetCompanyId,
      roleTemplateId: role.roleTemplateId,
      roleCode: normalizeCode(role.roleCode),
      roleName: role.roleName,
      hierarchyCode: normalizeCode(role.hierarchyCode || templateData.hierarchy.hierarchyCode),
      isMandatory: Boolean(role.isMandatory),
      isActive: role.isActive !== false,
      createdBy: userId || undefined,
    });

    roleByCode.set(normalizeCode(role.roleCode), createdRole);
  }

  const dashboardByRoleCode = new Map();
  for (const dashboard of Array.isArray(templateData.dashboards) ? templateData.dashboards : []) {
    const normalizedRoleCode = normalizeCode(dashboard.roleCode);
    const roleConfig = roleByCode.get(normalizedRoleCode);
    if (!roleConfig) continue;

    const createdDashboard = await CompanyDashboardConfig.create({
      companyId: targetCompanyId,
      companyRoleConfigId: roleConfig._id,
      roleCode: normalizedRoleCode,
      roleName: dashboard.roleName || roleConfig.roleName,
      dashboardTitle: dashboard.dashboardTitle,
      dashboardCode: normalizeCode(dashboard.dashboardCode),
      shellConfig: dashboard.shellConfig || {},
      sidebarItems: dashboard.sidebarItems || [],
      sharedFeatures: dashboard.sharedFeatures || [],
      isActive: dashboard.isActive !== false,
      createdBy: userId || undefined,
    });

    dashboardByRoleCode.set(normalizedRoleCode, createdDashboard);
  }

  const moduleByRoleCodeAndCode = new Map();
  for (const moduleItem of Array.isArray(templateData.modules) ? templateData.modules : []) {
    const normalizedRoleCode = normalizeCode(moduleItem.roleCode);
    const normalizedModuleCode = normalizeCode(moduleItem.moduleCode);

    const roleConfig = roleByCode.get(normalizedRoleCode);
    const dashboard = dashboardByRoleCode.get(normalizedRoleCode);
    if (!roleConfig || !dashboard) continue;

    const createdModule = await CompanyRoleModuleConfig.create({
      companyId: targetCompanyId,
      companyRoleConfigId: roleConfig._id,
      companyDashboardConfigId: dashboard._id,
      moduleTemplateId: moduleItem.moduleTemplateId,
      moduleCode: normalizedModuleCode,
      moduleName: moduleItem.moduleName,
      moduleType: moduleItem.moduleType || null,
      selectedSubtypes: moduleItem.selectedSubtypes || [],
      selectedSections: moduleItem.selectedSections || [],
      sidebarLabel: moduleItem.sidebarLabel || moduleItem.moduleName,
      sidebarPath: moduleItem.sidebarPath || `/runtime-dashboard/${normalizedModuleCode}`,
      sidebarOrder: Number(moduleItem.sidebarOrder || 0),
      isActive: moduleItem.isActive !== false,
      createdBy: userId || undefined,
    });

    moduleByRoleCodeAndCode.set(`${normalizedRoleCode}::${normalizedModuleCode}`, {
      module: createdModule,
      role: roleConfig,
      dashboard,
    });
  }

  for (const permission of Array.isArray(templateData.permissions) ? templateData.permissions : []) {
    const normalizedRoleCode = normalizeCode(permission.roleCode);
    const normalizedModuleCode = normalizeCode(permission.moduleCode);
    const mapped = moduleByRoleCodeAndCode.get(`${normalizedRoleCode}::${normalizedModuleCode}`);
    if (!mapped) continue;

    await CompanyRoleModulePermission.create({
      companyId: targetCompanyId,
      companyRoleConfigId: mapped.role._id,
      companyDashboardConfigId: mapped.dashboard._id,
      companyRoleModuleConfigId: mapped.module._id,
      moduleCode: normalizedModuleCode,
      roleCode: normalizedRoleCode,
      allowedActions: permission.allowedActions || [],
      sectionPermissions: permission.sectionPermissions || [],
      isActive: permission.isActive !== false,
      createdBy: userId || undefined,
    });
  }

  if (applyDocuments) {
    for (const template of Array.isArray(templateData.documentTemplates) ? templateData.documentTemplates : []) {
      await CompanyDocumentTemplate.create({
        companyId: targetCompanyId,
        documentType: normalizeCode(template.documentType),
        templateCode: normalizeCode(template.templateCode),
        templateName: template.templateName,
        description: template.description || "",
        layoutVariant: template.layoutVariant || "standard",
        styleConfig: template.styleConfig || {},
        headerConfig: template.headerConfig || {},
        footerConfig: template.footerConfig || {},
        isDefault: Boolean(template.isDefault),
        isActive: template.isActive !== false,
        createdBy: userId || undefined,
      });
    }
  }

  await upsertOnboardingStateForAppliedSetup(targetCompanyId, userId, {
    settingsApplied: applySettings,
    documentsApplied: applyDocuments,
  });

  return buildAppliedFlags({ applySettings, applyDocuments });
}

async function applySetupTemplateToCompany(companyId, templateId, options = {}, userId) {
  const targetCompany = await ensureCompany(companyId);

  const template = await CompanySetupTemplate.findById(templateId).lean();
  if (!template || !template.isActive) {
    const error = new Error("Active setup template not found");
    error.status = 404;
    throw error;
  }

  const overwriteExisting = Boolean(options.overwriteExisting);
  if (!overwriteExisting && (await hasExistingSetup(targetCompany._id))) {
    const error = new Error("Target company already has configuration. Use overwriteExisting=true to replace.");
    error.status = 400;
    throw error;
  }

  if (overwriteExisting) {
    await clearExistingSetup(targetCompany._id);
  }

  const applied = await applyTemplateDataToCompany(targetCompany._id, template.templateData || {}, options, userId);
  return {
    company: { _id: targetCompany._id, name: targetCompany.name },
    applied,
    template,
  };
}

async function cloneCompanyConfiguration(sourceCompanyId, targetCompanyId, options = {}, userId) {
  const sourceCompany = await ensureCompany(sourceCompanyId);
  const targetCompany = await ensureCompany(targetCompanyId);

  const overwriteExisting = Boolean(options.overwriteExisting);
  if (!overwriteExisting && (await hasExistingSetup(targetCompany._id))) {
    const error = new Error("Target company already has configuration. Use overwriteExisting=true to replace.");
    error.status = 400;
    throw error;
  }

  if (overwriteExisting) {
    await clearExistingSetup(targetCompany._id);
  }

  const templateData = await extractCompanySetupTemplateData(sourceCompany._id);
  const applied = await applyTemplateDataToCompany(targetCompany._id, templateData, options, userId);

  return {
    sourceCompanyId: sourceCompany._id,
    targetCompanyId: targetCompany._id,
    applied,
  };
}

module.exports = {
  extractCompanySetupTemplateData,
  createSetupTemplateFromCompany,
  applySetupTemplateToCompany,
  cloneCompanyConfiguration,
};
