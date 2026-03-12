const mongoose = require("mongoose");
const Company = require("../models/Company");
const HierarchyTemplate = require("../models/HierarchyTemplate");
const CompanyHierarchyConfig = require("../models/CompanyHierarchyConfig");

async function assignHierarchyToCompany(companyId, hierarchyTemplateId, userId) {
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    const error = new Error("Invalid company id");
    error.status = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(hierarchyTemplateId)) {
    const error = new Error("Invalid hierarchyTemplateId");
    error.status = 400;
    throw error;
  }

  const company = await Company.findById(companyId);
  if (!company) {
    const error = new Error("Company not found");
    error.status = 404;
    throw error;
  }

  const hierarchyTemplate = await HierarchyTemplate.findById(hierarchyTemplateId).lean();
  if (!hierarchyTemplate) {
    const error = new Error("Hierarchy template not found");
    error.status = 404;
    throw error;
  }

  if (!hierarchyTemplate.isActive) {
    const error = new Error("Hierarchy template is inactive");
    error.status = 400;
    throw error;
  }

  if (!Array.isArray(hierarchyTemplate.levels) || hierarchyTemplate.levels.length === 0) {
    const error = new Error("Hierarchy template must have levels");
    error.status = 400;
    throw error;
  }

  const levels = hierarchyTemplate.levels
    .map((level) => ({
      key: String(level.key || "").trim().toLowerCase(),
      label: String(level.label || "").trim(),
      order: Number(level.order || 0),
    }))
    .filter((level) => level.key && level.label && Number.isFinite(level.order) && level.order > 0)
    .sort((a, b) => a.order - b.order);

  if (levels.length === 0) {
    const error = new Error("Hierarchy template must have valid levels");
    error.status = 400;
    throw error;
  }

  const hierarchyConfig = await CompanyHierarchyConfig.findOneAndUpdate(
    { companyId: company._id },
    {
      companyId: company._id,
      hierarchyTemplateId: hierarchyTemplate._id,
      hierarchyCode: hierarchyTemplate.code,
      hierarchyName: hierarchyTemplate.name,
      levels,
      isActive: true,
      createdBy: userId || undefined,
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  company.activeHierarchyConfigId = hierarchyConfig._id;
  company.activeHierarchyCode = hierarchyConfig.hierarchyCode;
  await company.save();

  return { company, hierarchyConfig };
}

async function getCompanyHierarchy(companyId) {
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

  const hierarchyConfig = await CompanyHierarchyConfig.findOne({ companyId })
    .populate("hierarchyTemplateId", "name code isActive levels")
    .lean();

  if (!hierarchyConfig) {
    const error = new Error("Hierarchy config not found for company");
    error.status = 404;
    throw error;
  }

  return hierarchyConfig;
}

module.exports = { assignHierarchyToCompany, getCompanyHierarchy };
