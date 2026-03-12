const mongoose = require("mongoose");
const Company = require("../models/Company");
const RoleTemplate = require("../models/RoleTemplate");
const CompanyHierarchyConfig = require("../models/CompanyHierarchyConfig");
const CompanyRoleConfig = require("../models/CompanyRoleConfig");

function normalizeCode(value) {
  return String(value || "").trim().toLowerCase();
}

async function assignRolesToCompany(companyId, roleTemplateIds, userId) {
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    const error = new Error("Invalid company id");
    error.status = 400;
    throw error;
  }

  const company = await Company.findById(companyId);
  if (!company) {
    const error = new Error("Company not found");
    error.status = 404;
    throw error;
  }

  const activeHierarchyCode = normalizeCode(company.activeHierarchyCode);
  if (!company.activeHierarchyConfigId || !activeHierarchyCode) {
    const error = new Error("Company must have an active hierarchy configuration");
    error.status = 400;
    throw error;
  }

  const hierarchyConfig = await CompanyHierarchyConfig.findOne({
    _id: company.activeHierarchyConfigId,
    companyId: company._id,
    isActive: true,
  }).lean();

  if (!hierarchyConfig) {
    const error = new Error("Active hierarchy configuration not found for company");
    error.status = 400;
    throw error;
  }

  const requestedIds = Array.isArray(roleTemplateIds) ? roleTemplateIds : [];
  const validRequestedIds = [...new Set(requestedIds.map((id) => String(id).trim()).filter(Boolean))];

  if (validRequestedIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    const error = new Error("roleTemplateIds contains invalid id(s)");
    error.status = 400;
    throw error;
  }

  const requestedRoleTemplates = validRequestedIds.length
    ? await RoleTemplate.find({ _id: { $in: validRequestedIds } }).lean()
    : [];

  if (requestedRoleTemplates.length !== validRequestedIds.length) {
    const error = new Error("One or more role templates were not found");
    error.status = 404;
    throw error;
  }

  let companyAdminTemplate = requestedRoleTemplates.find((template) => normalizeCode(template.code) === "company_admin");
  if (!companyAdminTemplate) {
    companyAdminTemplate = await RoleTemplate.findOne({ code: "company_admin" }).lean();
    if (!companyAdminTemplate) {
      const error = new Error("Required role template company_admin not found");
      error.status = 400;
      throw error;
    }
  }

  const templatesMap = new Map();
  [...requestedRoleTemplates, companyAdminTemplate].forEach((template) => {
    templatesMap.set(String(template._id), template);
  });

  const selectedTemplates = Array.from(templatesMap.values());

  selectedTemplates.forEach((template) => {
    if (!template.isActive) {
      const error = new Error(`Role template ${template.code} is inactive`);
      error.status = 400;
      throw error;
    }

    const supportedHierarchyCodes = Array.isArray(template.applicableHierarchyCodes)
      ? template.applicableHierarchyCodes.map(normalizeCode).filter(Boolean)
      : [];

    if (!supportedHierarchyCodes.includes(activeHierarchyCode)) {
      const error = new Error(`Role template ${template.code} is not compatible with hierarchy ${activeHierarchyCode}`);
      error.status = 400;
      throw error;
    }
  });

  const roleConfigsPayload = selectedTemplates.map((template) => ({
    companyId: company._id,
    roleTemplateId: template._id,
    roleCode: normalizeCode(template.code),
    roleName: String(template.name || "").trim(),
    hierarchyCode: activeHierarchyCode,
    isMandatory: Boolean(template.isMandatory || normalizeCode(template.code) === "company_admin"),
    isActive: true,
    createdBy: userId || undefined,
  }));

  const uniqueRoleCodes = new Set(roleConfigsPayload.map((item) => item.roleCode));
  if (uniqueRoleCodes.size !== roleConfigsPayload.length) {
    const error = new Error("Duplicate role codes are not allowed for a company");
    error.status = 400;
    throw error;
  }

  await CompanyRoleConfig.deleteMany({ companyId: company._id });
  const roles = await CompanyRoleConfig.insertMany(roleConfigsPayload, { ordered: true });

  const activeRoleCodes = [...uniqueRoleCodes].sort();
  company.activeRoleCodes = activeRoleCodes;
  company.hasRoleConfiguration = true;
  await company.save();

  return { company, roles };
}

async function getCompanyRoles(companyId) {
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

  const roles = await CompanyRoleConfig.find({ companyId })
    .sort({ isMandatory: -1, roleName: 1 })
    .lean();

  return roles;
}

async function getAvailableRoleTemplatesForCompany(companyId) {
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

  const activeHierarchyCode = normalizeCode(company.activeHierarchyCode);
  if (!activeHierarchyCode) {
    const error = new Error("Company does not have an active hierarchy code");
    error.status = 400;
    throw error;
  }

  return RoleTemplate.find({
    isActive: true,
    applicableHierarchyCodes: activeHierarchyCode,
  })
    .sort({ isMandatory: -1, name: 1 })
    .lean();
}

module.exports = {
  assignRolesToCompany,
  getCompanyRoles,
  getAvailableRoleTemplatesForCompany,
};
