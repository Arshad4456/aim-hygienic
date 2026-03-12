const mongoose = require("mongoose");
const Company = require("../models/Company");
const CompanyRoleConfig = require("../models/CompanyRoleConfig");
const CompanyDashboardConfig = require("../models/CompanyDashboardConfig");

function normalizeCode(value) {
  return String(value || "").trim().toLowerCase();
}

function defaultShellConfig() {
  return {
    hasHeader: true,
    hasSidebar: true,
    hasNotifications: true,
    hasProfileMenu: true,
    hasSettingsShortcut: true,
  };
}

function defaultSharedFeatures() {
  return [
    { code: "dashboard_home", title: "Dashboard Home", isEnabled: true },
    { code: "notifications", title: "Notifications", isEnabled: true },
    { code: "profile", title: "Profile", isEnabled: true },
    { code: "settings", title: "Settings", isEnabled: true },
  ];
}

async function generateDashboardsForCompany(companyId, userId) {
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

  if (!company.hasRoleConfiguration) {
    const error = new Error("Company role configuration is not completed");
    error.status = 400;
    throw error;
  }

  const roleConfigs = await CompanyRoleConfig.find({ companyId: company._id, isActive: true })
    .sort({ isMandatory: -1, roleName: 1 })
    .lean();

  if (roleConfigs.length === 0) {
    const error = new Error("No active company roles found");
    error.status = 400;
    throw error;
  }

  const dashboards = [];

  for (const roleConfig of roleConfigs) {
    const roleCode = normalizeCode(roleConfig.roleCode);
    const roleName = String(roleConfig.roleName || "").trim();

    const dashboard = await CompanyDashboardConfig.findOneAndUpdate(
      { companyId: company._id, roleCode },
      {
        companyId: company._id,
        companyRoleConfigId: roleConfig._id,
        roleCode,
        roleName,
        dashboardTitle: roleName,
        dashboardCode: roleCode,
        shellConfig: defaultShellConfig(),
        sidebarItems: [],
        sharedFeatures: defaultSharedFeatures(),
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

    dashboards.push(dashboard);
  }

  company.hasDashboardConfiguration = true;
  await company.save();

  dashboards.sort((a, b) => String(a.roleName || "").localeCompare(String(b.roleName || "")));

  return { company, dashboards };
}

async function getCompanyDashboards(companyId) {
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

  return CompanyDashboardConfig.find({ companyId })
    .sort({ roleName: 1 })
    .lean();
}

async function getCompanyDashboardByRole(companyId, roleCode) {
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    const error = new Error("Invalid company id");
    error.status = 400;
    throw error;
  }

  const normalizedRoleCode = normalizeCode(roleCode);
  if (!normalizedRoleCode) {
    const error = new Error("roleCode is required");
    error.status = 400;
    throw error;
  }

  const company = await Company.findById(companyId).lean();
  if (!company) {
    const error = new Error("Company not found");
    error.status = 404;
    throw error;
  }

  const dashboard = await CompanyDashboardConfig.findOne({
    companyId,
    roleCode: normalizedRoleCode,
  }).lean();

  if (!dashboard) {
    const error = new Error("Dashboard config not found for role");
    error.status = 404;
    throw error;
  }

  return dashboard;
}

module.exports = {
  generateDashboardsForCompany,
  getCompanyDashboards,
  getCompanyDashboardByRole,
};