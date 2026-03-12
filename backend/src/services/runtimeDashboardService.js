const mongoose = require("mongoose");
const Company = require("../models/Company");
const User = require("../models/User");
const CompanySettings = require("../models/CompanySettings");
const CompanyHierarchyConfig = require("../models/CompanyHierarchyConfig");
const CompanyRoleConfig = require("../models/CompanyRoleConfig");
const CompanyDashboardConfig = require("../models/CompanyDashboardConfig");
const CompanyRoleModuleConfig = require("../models/CompanyRoleModuleConfig");
const CompanyRoleModulePermission = require("../models/CompanyRoleModulePermission");

function normalizeCode(value) {
  return String(value || "").trim().toLowerCase();
}

async function resolveCompany(companyId) {
  const raw = String(companyId || "").trim();
  if (!raw) {
    const error = new Error("companyId is required");
    error.status = 400;
    throw error;
  }

  const conditions = [{ companyId: raw }, { slug: normalizeCode(raw) }];
  if (mongoose.Types.ObjectId.isValid(raw)) {
    conditions.unshift({ _id: raw });
  }

  const company = await Company.findOne({ $or: conditions, status: { $ne: "inactive" } }).lean();
  if (!company) {
    const error = new Error("Company not found");
    error.status = 404;
    throw error;
  }

  return company;
}

async function getRuntimeDashboardDefinition(companyId, roleCode) {
  const company = await resolveCompany(companyId);
  const normalizedRoleCode = normalizeCode(roleCode);
  if (!normalizedRoleCode) {
    const error = new Error("roleCode is required");
    error.status = 400;
    throw error;
  }

  const settings = await CompanySettings.findOne({ companyId: company._id }).lean();
  if (!settings) {
    const error = new Error("Company settings not found");
    error.status = 404;
    throw error;
  }

  const hierarchy = await CompanyHierarchyConfig.findOne({ companyId: company._id, isActive: true }).lean();
  if (!hierarchy) {
    const error = new Error("Active hierarchy configuration not found");
    error.status = 404;
    throw error;
  }

  const role = await CompanyRoleConfig.findOne({ companyId: company._id, roleCode: normalizedRoleCode, isActive: true }).lean();
  if (!role) {
    const error = new Error("Active role configuration not found for roleCode");
    error.status = 404;
    throw error;
  }

  const dashboard = await CompanyDashboardConfig.findOne({
    companyId: company._id,
    companyRoleConfigId: role._id,
    roleCode: normalizedRoleCode,
    isActive: true,
  }).lean();
  if (!dashboard) {
    const error = new Error("Active dashboard configuration not found for roleCode");
    error.status = 404;
    throw error;
  }

  const assignedModules = await CompanyRoleModuleConfig.find({
    companyId: company._id,
    companyRoleConfigId: role._id,
    companyDashboardConfigId: dashboard._id,
    isActive: true,
  })
    .sort({ sidebarOrder: 1, moduleName: 1 })
    .lean();

  const permissionDocs = assignedModules.length
    ? await CompanyRoleModulePermission.find({
        companyRoleModuleConfigId: { $in: assignedModules.map((moduleDoc) => moduleDoc._id) },
        isActive: true,
      }).lean()
    : [];

  const permissionByModuleConfigId = new Map(permissionDocs.map((permissionDoc) => [String(permissionDoc.companyRoleModuleConfigId), permissionDoc]));

  const modules = assignedModules.map((moduleDoc) => {
    const permission = permissionByModuleConfigId.get(String(moduleDoc._id));
    return {
      moduleCode: moduleDoc.moduleCode,
      moduleName: moduleDoc.moduleName,
      moduleType: moduleDoc.moduleType,
      selectedSubtypes: moduleDoc.selectedSubtypes || [],
      selectedSections: moduleDoc.selectedSections || [],
      sidebarLabel: moduleDoc.sidebarLabel,
      sidebarPath: moduleDoc.sidebarPath,
      sidebarOrder: moduleDoc.sidebarOrder,
      allowedActions: permission?.allowedActions || [],
      sectionPermissions: permission?.sectionPermissions || [],
    };
  });

  const activeModuleCodes = new Set(modules.map((moduleDoc) => moduleDoc.moduleCode));
  const shellSidebar = (Array.isArray(dashboard.sidebarItems) ? dashboard.sidebarItems : [])
    .filter((item) => item && item.isActive !== false && activeModuleCodes.has(normalizeCode(item.code)))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  return {
    company: {
      id: company._id,
      name: company.name,
      slug: company.slug,
      logoUrl: company.logoUrl,
      primaryColor: company.primaryColor,
      status: company.status,
    },
    settings: {
      appName: settings.appName,
      invoiceHeader: settings.invoiceHeader,
      invoiceFooter: settings.invoiceFooter,
      receiptHeader: settings.receiptHeader,
      receiptFooter: settings.receiptFooter,
      modules: settings.modules || {},
    },
    hierarchy: {
      hierarchyCode: hierarchy.hierarchyCode,
      hierarchyName: hierarchy.hierarchyName,
      levels: hierarchy.levels || [],
    },
    role: {
      roleCode: role.roleCode,
      roleName: role.roleName,
      isMandatory: Boolean(role.isMandatory),
    },
    shell: {
      dashboardTitle: dashboard.dashboardTitle,
      dashboardCode: dashboard.dashboardCode,
      shellConfig: dashboard.shellConfig || {},
      sharedFeatures: dashboard.sharedFeatures || [],
      sidebarItems: shellSidebar,
    },
    modules,
  };
}

async function getRuntimeDashboardDefinitionForUser(user) {
  if (!user?.uid) {
    const error = new Error("Authenticated user is required");
    error.status = 401;
    throw error;
  }

  const authUser = await User.findById(user.uid).lean();
  if (!authUser) {
    const error = new Error("Authenticated user not found");
    error.status = 404;
    throw error;
  }

  const companyId = String(authUser.companyId || "").trim();
  if (!companyId) {
    const error = new Error("User is not linked to a company");
    error.status = 400;
    throw error;
  }

  const roleToken = normalizeCode(user.role);
  const roleName = String(authUser.role || "").trim();
  const company = await resolveCompany(companyId);

  let roleConfig = await CompanyRoleConfig.findOne({
    companyId: company._id,
    roleCode: roleToken,
    isActive: true,
  }).lean();

  if (!roleConfig && roleName) {
    roleConfig = await CompanyRoleConfig.findOne({
      companyId: company._id,
      roleName,
      isActive: true,
    }).lean();
  }

  if (!roleConfig) {
    const error = new Error("User role configuration not found for company");
    error.status = 404;
    throw error;
  }

  return getRuntimeDashboardDefinition(String(company._id), roleConfig.roleCode);
}

module.exports = {
  getRuntimeDashboardDefinition,
  getRuntimeDashboardDefinitionForUser,
};