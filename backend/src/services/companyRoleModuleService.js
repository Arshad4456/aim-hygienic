const mongoose = require("mongoose");
const Company = require("../models/Company");
const CompanyRoleConfig = require("../models/CompanyRoleConfig");
const CompanyDashboardConfig = require("../models/CompanyDashboardConfig");
const ModuleTemplate = require("../models/ModuleTemplate");
const CompanyRoleModuleConfig = require("../models/CompanyRoleModuleConfig");

function normalizeCode(value) {
  return String(value || "").trim().toLowerCase();
}

function uniqueStringArray(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value).trim()).filter(Boolean))];
}

async function resolveCompanyRoleAndDashboard(companyId, roleCode) {
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
  });

  if (!dashboard) {
    const error = new Error("Active dashboard config not found for roleCode");
    error.status = 404;
    throw error;
  }

  return { company, companyRole, dashboard, roleCode: normalizedRoleCode };
}

async function getModuleTemplatesByIds(moduleTemplateIds) {
  const requestedIds = [...new Set((Array.isArray(moduleTemplateIds) ? moduleTemplateIds : []).map((id) => String(id).trim()).filter(Boolean))];
  if (requestedIds.length === 0) return [];

  if (requestedIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    const error = new Error("modules contains invalid moduleTemplateId");
    error.status = 400;
    throw error;
  }

  const templates = await ModuleTemplate.find({ _id: { $in: requestedIds } }).lean();
  if (templates.length !== requestedIds.length) {
    const error = new Error("One or more module templates were not found");
    error.status = 404;
    throw error;
  }

  return templates;
}

function validateModuleSelection(template, moduleSelection) {
  if (!template.isActive) {
    const error = new Error(`Module template ${template.code} is inactive`);
    error.status = 400;
    throw error;
  }

  const moduleType = moduleSelection.moduleType ? String(moduleSelection.moduleType).trim() : null;
  const templateTypes = uniqueStringArray(template.types);
  if (moduleType && !templateTypes.includes(moduleType)) {
    const error = new Error(`Invalid moduleType for module ${template.code}`);
    error.status = 400;
    throw error;
  }

  const selectedSubtypes = uniqueStringArray(moduleSelection.selectedSubtypes);
  const templateSubtypes = uniqueStringArray(template.subtypes);
  if (selectedSubtypes.some((subtype) => !templateSubtypes.includes(subtype))) {
    const error = new Error(`Invalid selectedSubtypes for module ${template.code}`);
    error.status = 400;
    throw error;
  }

  const selectedSections = uniqueStringArray(moduleSelection.selectedSections);
  const templateSections = uniqueStringArray(template.sections);
  if (selectedSections.some((section) => !templateSections.includes(section))) {
    const error = new Error(`Invalid selectedSections for module ${template.code}`);
    error.status = 400;
    throw error;
  }

  return { moduleType, selectedSubtypes, selectedSections };
}

async function regenerateDashboardSidebar(companyId, roleCode) {
  const normalizedRoleCode = normalizeCode(roleCode);
  const dashboard = await CompanyDashboardConfig.findOne({ companyId, roleCode: normalizedRoleCode, isActive: true });
  if (!dashboard) {
    const error = new Error("Dashboard config not found for sidebar regeneration");
    error.status = 404;
    throw error;
  }

  const modules = await CompanyRoleModuleConfig.find({
    companyId,
    companyRoleConfigId: dashboard.companyRoleConfigId,
    isActive: true,
  })
    .sort({ sidebarOrder: 1, moduleName: 1 })
    .lean();

  dashboard.sidebarItems = modules.map((moduleItem) => ({
    code: moduleItem.moduleCode,
    label: moduleItem.sidebarLabel,
    path: moduleItem.sidebarPath,
    order: moduleItem.sidebarOrder,
    isActive: moduleItem.isActive,
  }));

  await dashboard.save();
  return dashboard.toObject();
}

async function assignModulesToRoleDashboard(companyId, roleCode, modules, userId) {
  const { companyRole, dashboard } = await resolveCompanyRoleAndDashboard(companyId, roleCode);

  const providedModules = Array.isArray(modules) ? modules : [];
  const templateIds = providedModules.map((item) => item?.moduleTemplateId);
  const templates = await getModuleTemplatesByIds(templateIds);
  const templateById = new Map(templates.map((template) => [String(template._id), template]));

  const existingCount = await CompanyRoleModuleConfig.countDocuments({
    companyId,
    companyRoleConfigId: companyRole._id,
  });

  if (normalizeCode(roleCode) === "company_admin" && existingCount === 0) {
    const defaultTemplates = await ModuleTemplate.find({
      isActive: true,
      code: { $in: ["territory_assets", "hr_role_management"] },
    }).lean();

    const requestedTemplateIds = new Set(providedModules.map((item) => String(item.moduleTemplateId || "").trim()));
    for (const defaultTemplate of defaultTemplates) {
      const defaultTemplateId = String(defaultTemplate._id);
      if (!requestedTemplateIds.has(defaultTemplateId)) {
        providedModules.push({
          moduleTemplateId: defaultTemplateId,
          moduleType: null,
          selectedSubtypes: [],
          selectedSections: [],
        });
        templateById.set(defaultTemplateId, defaultTemplate);
      }
    }
  }

  const payloadByCode = new Map();

  for (const [index, moduleSelection] of providedModules.entries()) {
    const moduleTemplateId = String(moduleSelection?.moduleTemplateId || "").trim();
    const template = templateById.get(moduleTemplateId);
    if (!template) {
      const error = new Error("moduleTemplateId is required and must exist");
      error.status = 400;
      throw error;
    }

    const { moduleType, selectedSubtypes, selectedSections } = validateModuleSelection(template, moduleSelection || {});
    const moduleCode = normalizeCode(template.code);

    payloadByCode.set(moduleCode, {
      companyId,
      companyRoleConfigId: companyRole._id,
      companyDashboardConfigId: dashboard._id,
      moduleTemplateId: template._id,
      moduleCode,
      moduleName: template.name,
      moduleType,
      selectedSubtypes,
      selectedSections,
      sidebarLabel: template.name,
      sidebarPath: `/dashboards/${normalizeCode(roleCode)}/${moduleCode}`,
      sidebarOrder: index + 1,
      isActive: true,
      createdBy: userId || undefined,
    });
  }

  const finalPayload = Array.from(payloadByCode.values()).sort((a, b) => a.sidebarOrder - b.sidebarOrder);

  await CompanyRoleModuleConfig.deleteMany({ companyId, companyRoleConfigId: companyRole._id });

  const savedModules = finalPayload.length > 0 ? await CompanyRoleModuleConfig.insertMany(finalPayload, { ordered: true }) : [];

  const refreshedSidebarDashboard = await regenerateDashboardSidebar(companyId, roleCode);

  return { dashboard: refreshedSidebarDashboard, modules: savedModules.map((item) => item.toObject()) };
}

async function getRoleDashboardModules(companyId, roleCode) {
  const { companyRole } = await resolveCompanyRoleAndDashboard(companyId, roleCode);

  return CompanyRoleModuleConfig.find({
    companyId,
    companyRoleConfigId: companyRole._id,
  })
    .sort({ sidebarOrder: 1, moduleName: 1 })
    .lean();
}

module.exports = {
  assignModulesToRoleDashboard,
  getRoleDashboardModules,
  regenerateDashboardSidebar,
};