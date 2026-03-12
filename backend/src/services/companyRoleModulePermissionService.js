const mongoose = require("mongoose");
const Company = require("../models/Company");
const CompanyRoleConfig = require("../models/CompanyRoleConfig");
const CompanyDashboardConfig = require("../models/CompanyDashboardConfig");
const CompanyRoleModuleConfig = require("../models/CompanyRoleModuleConfig");
const CompanyRoleModulePermission = require("../models/CompanyRoleModulePermission");
const ModuleTemplate = require("../models/ModuleTemplate");

function normalizeCode(value) {
  return String(value || "").trim().toLowerCase();
}

function uniqueNormalized(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => normalizeCode(value)).filter(Boolean))];
}

async function resolveContext(companyId, roleCode, moduleCode) {
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    const error = new Error("Invalid company id");
    error.status = 400;
    throw error;
  }

  const company = await Company.findById(companyId).lean();
  if (!company) {
    const error = new Error("Company not found");
    error.status = 404;
    throw error;
  }

  const normalizedRoleCode = normalizeCode(roleCode);
  if (!normalizedRoleCode) {
    const error = new Error("roleCode is required");
    error.status = 400;
    throw error;
  }

  const companyRole = await CompanyRoleConfig.findOne({
    companyId,
    roleCode: normalizedRoleCode,
    isActive: true,
  }).lean();
  if (!companyRole) {
    const error = new Error("Active company role not found for roleCode");
    error.status = 404;
    throw error;
  }

  const dashboard = await CompanyDashboardConfig.findOne({
    companyId,
    roleCode: normalizedRoleCode,
    isActive: true,
  }).lean();
  if (!dashboard) {
    const error = new Error("Active dashboard config not found for roleCode");
    error.status = 404;
    throw error;
  }

  const normalizedModuleCode = normalizeCode(moduleCode);
  if (!normalizedModuleCode) {
    const error = new Error("moduleCode is required");
    error.status = 400;
    throw error;
  }

  const assignedModule = await CompanyRoleModuleConfig.findOne({
    companyId,
    companyRoleConfigId: companyRole._id,
    companyDashboardConfigId: dashboard._id,
    moduleCode: normalizedModuleCode,
    isActive: true,
  }).lean();

  if (!assignedModule) {
    const error = new Error("Assigned module not found for company role dashboard");
    error.status = 404;
    throw error;
  }

  const moduleTemplate = await ModuleTemplate.findById(assignedModule.moduleTemplateId).lean();
  if (!moduleTemplate) {
    const error = new Error("Module template not found for assigned module");
    error.status = 404;
    throw error;
  }

  return {
    company,
    companyRole,
    dashboard,
    assignedModule,
    moduleTemplate,
    roleCode: normalizedRoleCode,
    moduleCode: normalizedModuleCode,
  };
}

function validatePermissionsPayload(moduleTemplate, payload) {
  const supportedActions = uniqueNormalized(moduleTemplate.supportedActions);
  const moduleSections = uniqueNormalized(moduleTemplate.sections);

  const allowedActions = uniqueNormalized(payload?.allowedActions);
  if (allowedActions.some((action) => !supportedActions.includes(action))) {
    const error = new Error("allowedActions contains unsupported actions for this module");
    error.status = 400;
    throw error;
  }

  const rawSectionPermissions = Array.isArray(payload?.sectionPermissions) ? payload.sectionPermissions : [];
  const sectionPermissions = rawSectionPermissions.map((sectionPermission) => {
    const sectionCode = normalizeCode(sectionPermission?.sectionCode);
    if (!sectionCode) {
      const error = new Error("sectionPermissions contains invalid sectionCode");
      error.status = 400;
      throw error;
    }

    if (!moduleSections.includes(sectionCode)) {
      const error = new Error(`sectionCode ${sectionCode} is not valid for this module`);
      error.status = 400;
      throw error;
    }

    const sectionActions = uniqueNormalized(sectionPermission?.allowedActions);
    if (sectionActions.some((action) => !supportedActions.includes(action))) {
      const error = new Error(`sectionPermissions for ${sectionCode} contains unsupported actions`);
      error.status = 400;
      throw error;
    }

    return { sectionCode, allowedActions: sectionActions };
  });

  return { allowedActions, sectionPermissions };
}

async function assignPermissionsToRoleModule(companyId, roleCode, moduleCode, payload, userId) {
  const { companyRole, dashboard, assignedModule, moduleTemplate, roleCode: normalizedRoleCode, moduleCode: normalizedModuleCode } =
    await resolveContext(companyId, roleCode, moduleCode);

  const { allowedActions, sectionPermissions } = validatePermissionsPayload(moduleTemplate, payload);

  const permission = await CompanyRoleModulePermission.findOneAndUpdate(
    { companyRoleModuleConfigId: assignedModule._id },
    {
      companyId,
      companyRoleConfigId: companyRole._id,
      companyDashboardConfigId: dashboard._id,
      companyRoleModuleConfigId: assignedModule._id,
      moduleCode: normalizedModuleCode,
      roleCode: normalizedRoleCode,
      allowedActions,
      sectionPermissions,
      isActive: true,
      createdBy: userId || undefined,
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  ).lean();

  return permission;
}

async function getRoleModulePermissions(companyId, roleCode, moduleCode) {
  const { assignedModule } = await resolveContext(companyId, roleCode, moduleCode);

  const permission = await CompanyRoleModulePermission.findOne({
    companyRoleModuleConfigId: assignedModule._id,
  }).lean();

  if (!permission) {
    const error = new Error("Module permission config not found");
    error.status = 404;
    throw error;
  }

  return permission;
}

module.exports = {
  assignPermissionsToRoleModule,
  getRoleModulePermissions,
};
