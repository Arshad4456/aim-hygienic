const mongoose = require("mongoose");

const Company = require("../models/Company");
const CompanySettings = require("../models/CompanySettings");
const CompanyDocumentTemplate = require("../models/CompanyDocumentTemplate");
const DocumentTemplatePreset = require("../models/DocumentTemplatePreset");

const ALLOWED_DOCUMENT_TYPES = ["invoice", "receipt"];

function normalizeCode(value) {
  return String(value || "").trim().toLowerCase();
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function ensureCompany(companyId) {
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

  return company;
}

function validateTemplatePayload(payload, partial = false) {
  const normalizedDocumentType = payload.documentType !== undefined ? normalizeCode(payload.documentType) : undefined;
  if (!partial || payload.documentType !== undefined) {
    if (!normalizedDocumentType || !ALLOWED_DOCUMENT_TYPES.includes(normalizedDocumentType)) {
      const error = new Error("documentType must be invoice or receipt");
      error.status = 400;
      throw error;
    }
  }

  const normalizedTemplateCode = payload.templateCode !== undefined ? normalizeCode(payload.templateCode) : undefined;
  if (!partial || payload.templateCode !== undefined) {
    if (!normalizedTemplateCode) {
      const error = new Error("templateCode is required");
      error.status = 400;
      throw error;
    }
  }

  const normalizedTemplateName = payload.templateName !== undefined ? String(payload.templateName || "").trim() : undefined;
  if (!partial || payload.templateName !== undefined) {
    if (!normalizedTemplateName) {
      const error = new Error("templateName is required");
      error.status = 400;
      throw error;
    }
  }

  if (payload.layoutVariant !== undefined && !String(payload.layoutVariant || "").trim()) {
    const error = new Error("layoutVariant must be a non-empty string");
    error.status = 400;
    throw error;
  }

  if (payload.styleConfig !== undefined && !isObject(payload.styleConfig)) {
    const error = new Error("styleConfig must be an object");
    error.status = 400;
    throw error;
  }

  if (payload.headerConfig !== undefined && !isObject(payload.headerConfig)) {
    const error = new Error("headerConfig must be an object");
    error.status = 400;
    throw error;
  }

  if (payload.footerConfig !== undefined && !isObject(payload.footerConfig)) {
    const error = new Error("footerConfig must be an object");
    error.status = 400;
    throw error;
  }

  return {
    documentType: normalizedDocumentType,
    templateCode: normalizedTemplateCode,
    templateName: normalizedTemplateName,
  };
}

async function unsetDefaultForType(companyId, documentType, excludeTemplateId) {
  const query = {
    companyId,
    documentType,
    isActive: true,
    isDefault: true,
  };

  if (excludeTemplateId && mongoose.Types.ObjectId.isValid(excludeTemplateId)) {
    query._id = { $ne: excludeTemplateId };
  }

  await CompanyDocumentTemplate.updateMany(query, { $set: { isDefault: false } });
}

async function updateSettingsDefaultCode(companyId, documentType, templateCode) {
  const update =
    documentType === "invoice"
      ? { defaultInvoiceTemplateCode: templateCode }
      : { defaultReceiptTemplateCode: templateCode };

  await CompanySettings.findOneAndUpdate({ companyId }, { $set: update }, { upsert: false });
}

async function createCompanyDocumentTemplate(companyId, payload, userId) {
  await ensureCompany(companyId);
  const normalized = validateTemplatePayload(payload);

  if (payload.isDefault === true) {
    await unsetDefaultForType(companyId, normalized.documentType);
  }

  let created;
  try {
    created = await CompanyDocumentTemplate.create({
      companyId,
      documentType: normalized.documentType,
      templateCode: normalized.templateCode,
      templateName: normalized.templateName,
      description: String(payload.description || "").trim(),
      layoutVariant: String(payload.layoutVariant || "standard").trim(),
      styleConfig: isObject(payload.styleConfig) ? payload.styleConfig : {},
      headerConfig: isObject(payload.headerConfig) ? payload.headerConfig : {},
      footerConfig: isObject(payload.footerConfig) ? payload.footerConfig : {},
      isDefault: Boolean(payload.isDefault),
      isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
      createdBy: userId || undefined,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const conflict = new Error("templateCode already exists for this company and documentType");
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }

  if (created.isDefault) {
    await updateSettingsDefaultCode(companyId, created.documentType, created.templateCode);
  }

  return created.toObject();
}

async function listCompanyDocumentTemplates(companyId, filters = {}) {
  await ensureCompany(companyId);

  const query = { companyId };
  if (filters.documentType) {
    const documentType = normalizeCode(filters.documentType);
    if (!ALLOWED_DOCUMENT_TYPES.includes(documentType)) {
      const error = new Error("documentType must be invoice or receipt");
      error.status = 400;
      throw error;
    }
    query.documentType = documentType;
  }

  return CompanyDocumentTemplate.find(query).sort({ documentType: 1, createdAt: -1 }).lean();
}

async function getCompanyDocumentTemplate(companyId, templateId) {
  await ensureCompany(companyId);

  if (!mongoose.Types.ObjectId.isValid(templateId)) {
    const error = new Error("Invalid template id");
    error.status = 400;
    throw error;
  }

  const template = await CompanyDocumentTemplate.findOne({ _id: templateId, companyId }).lean();
  if (!template) {
    const error = new Error("Company document template not found");
    error.status = 404;
    throw error;
  }

  return template;
}

async function updateCompanyDocumentTemplate(companyId, templateId, payload) {
  await ensureCompany(companyId);
  if (!mongoose.Types.ObjectId.isValid(templateId)) {
    const error = new Error("Invalid template id");
    error.status = 400;
    throw error;
  }

  const existing = await CompanyDocumentTemplate.findOne({ _id: templateId, companyId });
  if (!existing) {
    const error = new Error("Company document template not found");
    error.status = 404;
    throw error;
  }

  validateTemplatePayload(payload, true);

  const nextDocumentType = payload.documentType !== undefined ? normalizeCode(payload.documentType) : existing.documentType;
  const nextTemplateCode = payload.templateCode !== undefined ? normalizeCode(payload.templateCode) : existing.templateCode;

  if (payload.isDefault === true) {
    await unsetDefaultForType(companyId, nextDocumentType, templateId);
  }

  existing.documentType = nextDocumentType;
  existing.templateCode = nextTemplateCode;

  if (payload.templateName !== undefined) existing.templateName = String(payload.templateName || "").trim();
  if (payload.description !== undefined) existing.description = String(payload.description || "").trim();
  if (payload.layoutVariant !== undefined) existing.layoutVariant = String(payload.layoutVariant || "").trim();
  if (payload.styleConfig !== undefined) existing.styleConfig = payload.styleConfig;
  if (payload.headerConfig !== undefined) existing.headerConfig = payload.headerConfig;
  if (payload.footerConfig !== undefined) existing.footerConfig = payload.footerConfig;
  if (payload.isActive !== undefined) existing.isActive = Boolean(payload.isActive);
  if (payload.isDefault !== undefined) existing.isDefault = Boolean(payload.isDefault);

  try {
    await existing.save();
  } catch (error) {
    if (error?.code === 11000) {
      const conflict = new Error("templateCode already exists for this company and documentType");
      conflict.status = 409;
      throw conflict;
    }
    throw error;
  }

  if (existing.isDefault) {
    await updateSettingsDefaultCode(companyId, existing.documentType, existing.templateCode);
  }

  return existing.toObject();
}

async function getDefaultCompanyDocumentTemplate(companyId, documentType) {
  await ensureCompany(companyId);

  const normalizedDocumentType = normalizeCode(documentType);
  if (!ALLOWED_DOCUMENT_TYPES.includes(normalizedDocumentType)) {
    const error = new Error("documentType must be invoice or receipt");
    error.status = 400;
    throw error;
  }

  return CompanyDocumentTemplate.findOne({
    companyId,
    documentType: normalizedDocumentType,
    isDefault: true,
    isActive: true,
  })
    .sort({ updatedAt: -1 })
    .lean();
}

async function applyPresetToCompany(companyId, presetId, isDefault, userId) {
  await ensureCompany(companyId);

  if (!mongoose.Types.ObjectId.isValid(presetId)) {
    const error = new Error("Invalid preset id");
    error.status = 400;
    throw error;
  }

  const preset = await DocumentTemplatePreset.findById(presetId).lean();
  if (!preset || !preset.isActive) {
    const error = new Error("Active preset not found");
    error.status = 404;
    throw error;
  }

  return createCompanyDocumentTemplate(
    companyId,
    {
      documentType: preset.documentType,
      templateCode: preset.templateCode,
      templateName: preset.templateName,
      description: preset.description,
      layoutVariant: preset.layoutVariant,
      styleConfig: preset.styleConfig,
      headerConfig: preset.headerConfig,
      footerConfig: preset.footerConfig,
      isDefault: Boolean(isDefault),
      isActive: true,
    },
    userId
  );
}

module.exports = {
  ALLOWED_DOCUMENT_TYPES,
  createCompanyDocumentTemplate,
  listCompanyDocumentTemplates,
  getCompanyDocumentTemplate,
  updateCompanyDocumentTemplate,
  getDefaultCompanyDocumentTemplate,
  applyPresetToCompany,
};
