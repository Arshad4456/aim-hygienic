const Company = require("../models/Company");
const CompanySettings = require("../models/CompanySettings");
const CompanyHierarchyConfig = require("../models/CompanyHierarchyConfig");
const CompanyRoleConfig = require("../models/CompanyRoleConfig");
const CompanyDashboardConfig = require("../models/CompanyDashboardConfig");
const CompanyRoleModuleConfig = require("../models/CompanyRoleModuleConfig");
const CompanyRoleModulePermission = require("../models/CompanyRoleModulePermission");
const CompanyDocumentTemplate = require("../models/CompanyDocumentTemplate");
const Subscription = require("../models/Subscription");
const CompanyConfigSnapshot = require("../models/CompanyConfigSnapshot");
const { getCurrentCompanySubscription } = require("./subscriptionLifecycleService");

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

async function buildCompanyConfigSnapshotData(companyId) {
  await ensureCompany(companyId);

  const [settings, hierarchy, roles, dashboards, modules, permissions, documentTemplates, subscription] = await Promise.all([
    CompanySettings.findOne({ companyId }).lean(),
    CompanyHierarchyConfig.findOne({ companyId, isActive: true }).lean(),
    CompanyRoleConfig.find({ companyId, isActive: true }).sort({ roleName: 1 }).lean(),
    CompanyDashboardConfig.find({ companyId, isActive: true }).sort({ roleCode: 1 }).lean(),
    CompanyRoleModuleConfig.find({ companyId, isActive: true }).sort({ roleCode: 1, sidebarOrder: 1 }).lean(),
    CompanyRoleModulePermission.find({ companyId, isActive: true }).sort({ roleCode: 1, moduleCode: 1 }).lean(),
    CompanyDocumentTemplate.find({ companyId, isActive: true }).sort({ documentType: 1, isDefault: -1, createdAt: -1 }).lean(),
    getCurrentCompanySubscription(companyId),
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
    subscription: subscription
      ? {
          subscriptionId: subscription._id,
          planId: subscription.planId?._id || subscription.planId || null,
          planCode: subscription.planId?.code || null,
          planName: subscription.planId?.name || null,
          billingCycle: subscription.billingCycle,
          status: subscription.status,
          paymentStatus: subscription.paymentStatus,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        }
      : null,
  };
}

async function createCompanyConfigSnapshot(companyId, payload = {}, userId) {
  const company = await ensureCompany(companyId);
  const latest = await CompanyConfigSnapshot.findOne({ companyId: company._id }).sort({ versionNumber: -1 }).lean();
  const nextVersionNumber = Number(latest?.versionNumber || 0) + 1;

  const snapshotData = await buildCompanyConfigSnapshotData(company._id);

  const snapshot = await CompanyConfigSnapshot.create({
    companyId: company._id,
    versionNumber: nextVersionNumber,
    versionLabel: String(payload.versionLabel || "").trim(),
    snapshotType: String(payload.snapshotType || "manual").trim(),
    summary: String(payload.summary || "").trim(),
    snapshotData,
    createdBy: userId || undefined,
  });

  return snapshot.toObject();
}

async function listCompanyConfigSnapshots(companyId) {
  const company = await ensureCompany(companyId);
  return CompanyConfigSnapshot.find({ companyId: company._id }).sort({ versionNumber: -1, createdAt: -1 }).lean();
}

async function getCompanyConfigSnapshot(companyId, snapshotId) {
  const company = await ensureCompany(companyId);
  const snapshot = await CompanyConfigSnapshot.findOne({ _id: snapshotId, companyId: company._id }).lean();
  if (!snapshot) {
    const error = new Error("Configuration snapshot not found");
    error.status = 404;
    throw error;
  }
  return snapshot;
}

async function clearCompanyConfiguration(companyId) {
  await Promise.all([
    CompanyHierarchyConfig.deleteMany({ companyId }),
    CompanyRoleConfig.deleteMany({ companyId }),
    CompanyDashboardConfig.deleteMany({ companyId }),
    CompanyRoleModuleConfig.deleteMany({ companyId }),
    CompanyRoleModulePermission.deleteMany({ companyId }),
    CompanyDocumentTemplate.deleteMany({ companyId }),
  ]);
}

async function applySnapshotDataToCompany(companyId, snapshotData, userId, options = {}) {
  if (snapshotData.settings) {
    await CompanySettings.findOneAndUpdate(
      { companyId },
      {
        $set: {
          appName: String(snapshotData.settings.appName || "").trim(),
          logoUrl: String(snapshotData.settings.logoUrl || "").trim(),
          primaryColor: String(snapshotData.settings.primaryColor || "").trim(),
          invoiceHeader: String(snapshotData.settings.invoiceHeader || "").trim(),
          invoiceFooter: String(snapshotData.settings.invoiceFooter || "").trim(),
          receiptHeader: String(snapshotData.settings.receiptHeader || "").trim(),
          receiptFooter: String(snapshotData.settings.receiptFooter || "").trim(),
          modules: snapshotData.settings.modules && typeof snapshotData.settings.modules === "object" ? snapshotData.settings.modules : {},
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  if (!snapshotData.hierarchy || !snapshotData.hierarchy.hierarchyTemplateId) {
    const error = new Error("Snapshot hierarchy configuration is missing");
    error.status = 400;
    throw error;
  }

  const hierarchyConfig = await CompanyHierarchyConfig.create({
    companyId,
    hierarchyTemplateId: snapshotData.hierarchy.hierarchyTemplateId,
    hierarchyCode: normalizeCode(snapshotData.hierarchy.hierarchyCode),
    hierarchyName: snapshotData.hierarchy.hierarchyName,
    levels: Array.isArray(snapshotData.hierarchy.levels) ? snapshotData.hierarchy.levels : [],
    isActive: true,
    createdBy: userId || undefined,
  });

  await Company.findByIdAndUpdate(companyId, {
    $set: {
      activeHierarchyConfigId: hierarchyConfig._id,
      activeHierarchyCode: hierarchyConfig.hierarchyCode,
      logoUrl: String(snapshotData.settings?.logoUrl || "").trim(),
      primaryColor: String(snapshotData.settings?.primaryColor || "").trim(),
    },
  });

  const roleByCode = new Map();
  for (const role of Array.isArray(snapshotData.roles) ? snapshotData.roles : []) {
    const createdRole = await CompanyRoleConfig.create({
      companyId,
      roleTemplateId: role.roleTemplateId,
      roleCode: normalizeCode(role.roleCode),
      roleName: role.roleName,
      hierarchyCode: normalizeCode(role.hierarchyCode || snapshotData.hierarchy.hierarchyCode),
      isMandatory: Boolean(role.isMandatory),
      isActive: role.isActive !== false,
      createdBy: userId || undefined,
    });

    roleByCode.set(normalizeCode(role.roleCode), createdRole);
  }

  const dashboardByRoleCode = new Map();
  for (const dashboard of Array.isArray(snapshotData.dashboards) ? snapshotData.dashboards : []) {
    const normalizedRoleCode = normalizeCode(dashboard.roleCode);
    const roleConfig = roleByCode.get(normalizedRoleCode);
    if (!roleConfig) continue;

    const createdDashboard = await CompanyDashboardConfig.create({
      companyId,
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

  const moduleByKey = new Map();
  for (const moduleItem of Array.isArray(snapshotData.modules) ? snapshotData.modules : []) {
    const normalizedRoleCode = normalizeCode(moduleItem.roleCode);
    const normalizedModuleCode = normalizeCode(moduleItem.moduleCode);

    const roleConfig = roleByCode.get(normalizedRoleCode);
    const dashboard = dashboardByRoleCode.get(normalizedRoleCode);
    if (!roleConfig || !dashboard) continue;

    const createdModule = await CompanyRoleModuleConfig.create({
      companyId,
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

    moduleByKey.set(`${normalizedRoleCode}::${normalizedModuleCode}`, { module: createdModule, role: roleConfig, dashboard });
  }

  for (const permission of Array.isArray(snapshotData.permissions) ? snapshotData.permissions : []) {
    const normalizedRoleCode = normalizeCode(permission.roleCode);
    const normalizedModuleCode = normalizeCode(permission.moduleCode);
    const mapped = moduleByKey.get(`${normalizedRoleCode}::${normalizedModuleCode}`);
    if (!mapped) continue;

    await CompanyRoleModulePermission.create({
      companyId,
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

  for (const template of Array.isArray(snapshotData.documentTemplates) ? snapshotData.documentTemplates : []) {
    await CompanyDocumentTemplate.create({
      companyId,
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

  if (options.restoreSubscription && snapshotData.subscription?.planId) {
    const current = await getCurrentCompanySubscription(companyId);
    if (current) {
      await Subscription.findByIdAndUpdate(current._id, {
        $set: {
          planId: snapshotData.subscription.planId,
          billingCycle: snapshotData.subscription.billingCycle || current.billingCycle,
          status: snapshotData.subscription.status || current.status,
          paymentStatus: snapshotData.subscription.paymentStatus || current.paymentStatus,
          startDate: snapshotData.subscription.startDate || current.startDate,
          endDate: snapshotData.subscription.endDate || current.endDate,
        },
      });
    }
  }

  return {
    settings: Boolean(snapshotData.settings),
    hierarchy: true,
    roles: Array.isArray(snapshotData.roles) ? snapshotData.roles.length : 0,
    dashboards: Array.isArray(snapshotData.dashboards) ? snapshotData.dashboards.length : 0,
    modules: Array.isArray(snapshotData.modules) ? snapshotData.modules.length : 0,
    permissions: Array.isArray(snapshotData.permissions) ? snapshotData.permissions.length : 0,
    documentTemplates: Array.isArray(snapshotData.documentTemplates) ? snapshotData.documentTemplates.length : 0,
    subscriptionRestored: Boolean(options.restoreSubscription && snapshotData.subscription?.planId),
  };
}

async function restoreCompanyConfigSnapshot(companyId, snapshotId, options = {}, userId) {
  const company = await ensureCompany(companyId);
  const snapshot = await getCompanyConfigSnapshot(company._id, snapshotId);

  const safetySnapshot = await createCompanyConfigSnapshot(
    company._id,
    {
      versionLabel: `Safety before restore v${snapshot.versionNumber}`,
      snapshotType: "before_restore",
      summary: `Auto safety snapshot before restoring version ${snapshot.versionNumber}`,
    },
    userId
  );

  await clearCompanyConfiguration(company._id);
  const restored = await applySnapshotDataToCompany(company._id, snapshot.snapshotData || {}, userId, options);

  return {
    company: { _id: company._id, name: company.name },
    restoredFrom: {
      snapshotId: snapshot._id,
      versionNumber: snapshot.versionNumber,
      versionLabel: snapshot.versionLabel,
    },
    safetySnapshot: {
      snapshotId: safetySnapshot._id,
      versionNumber: safetySnapshot.versionNumber,
    },
    restored,
  };
}

module.exports = {
  buildCompanyConfigSnapshotData,
  createCompanyConfigSnapshot,
  listCompanyConfigSnapshots,
  getCompanyConfigSnapshot,
  restoreCompanyConfigSnapshot,
};
