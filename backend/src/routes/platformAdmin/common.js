const Company = require("../../models/Company");
const HierarchyTemplate = require("../../models/HierarchyTemplate");
const RoleTemplate = require("../../models/RoleTemplate");
const ModuleTemplate = require("../../models/ModuleTemplate");
const DocumentTemplatePreset = require("../../models/DocumentTemplatePreset");
const Plan = require("../../models/Plan");
const { MODULE_CATALOG } = require("../../config/moduleCatalog");
const { ROLE_CATALOG } = require("../../config/roleCatalog");

function buildAuditContext(req) {
  return {
    actorUserId: req.user?.uid || req.user?._id,
    actorName: String(req.user?.username || req.user?.name || "").trim(),
    actorRole: String(req.user?.role || "").trim(),
    ipAddress: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim(),
    userAgent: String(req.headers["user-agent"] || ""),
  };
}

function fireAndForgetAudit(promise) {
  Promise.resolve(promise).catch(() => undefined);
}

async function ensureCompanyOrThrow(companyId) {
  const company = await Company.findById(companyId).lean();
  if (!company) {
    const error = new Error("Company not found");
    error.status = 404;
    throw error;
  }
  return company;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function generateUniqueCompanySlug(rawValue) {
  const base = slugify(rawValue || "company") || `company-${Date.now()}`;
  let candidate = base;
  let counter = 2;
  while (await Company.exists({ slug: candidate })) {
    candidate = `${base}-${counter++}`;
  }
  return candidate;
}

async function ensurePlatformSeedData() {
  const hierarchyCount = await HierarchyTemplate.countDocuments();
  if (!hierarchyCount) {
    await HierarchyTemplate.insertMany([
      {
        name: 'Standard FMCG Hierarchy',
        code: 'standard_fmcg',
        description: 'Region → Zone → Territory → Field',
        levels: [
          { key: 'region', label: 'Region', order: 1 },
          { key: 'zone', label: 'Zone', order: 2 },
          { key: 'territory', label: 'Territory', order: 3 },
          { key: 'field', label: 'Field', order: 4 },
        ],
        isActive: true,
      },
      {
        name: 'Simple Sales Hierarchy',
        code: 'simple_sales',
        description: 'Region → Territory → Field',
        levels: [
          { key: 'region', label: 'Region', order: 1 },
          { key: 'territory', label: 'Territory', order: 2 },
          { key: 'field', label: 'Field', order: 3 },
        ],
        isActive: true,
      },
    ]);
  }

  const roleCount = await RoleTemplate.countDocuments();
  if (!roleCount) {
    const hierarchyCodes = ['standard_fmcg', 'simple_sales'];
    const docs = Object.values(ROLE_CATALOG)
      .filter((item) => item.code !== 'super_admin')
      .map((item) => ({
        name: item.label,
        code: item.code === 'admin' ? 'company_admin' : item.code,
        description: `${item.label} role template`,
        applicableHierarchyCodes: hierarchyCodes,
        isMandatory: item.code === 'admin',
        isActive: true,
      }));
    await RoleTemplate.insertMany(docs, { ordered: false }).catch(() => undefined);
  }

  const moduleCount = await ModuleTemplate.countDocuments();
  if (!moduleCount) {
    const docs = Object.values(MODULE_CATALOG).map((item) => ({
      name: item.moduleName,
      code: item.moduleCode,
      description: `${item.moduleName} module`,
      category: item.category || 'general',
      types: ['default'],
      subtypes: [],
      sections: item.defaultSections || [],
      supportedActions: item.defaultActions || [],
      isActive: true,
    }));
    await ModuleTemplate.insertMany(docs, { ordered: false }).catch(() => undefined);
  }


  const planCount = await Plan.countDocuments();
  if (!planCount) {
    await Plan.insertMany([
      { name: 'Starter', code: 'starter', description: 'Starter company plan', billingType: 'monthly', monthlyPrice: 0, yearlyPrice: 0, maxUsers: 25, maxWarehouses: 3, maxVehicles: 3, includedModules: ['territory_assets','hr_role_management','order_management','finance_accounts'], includedFeatures: ['runtime_dashboards','document_templates'], status: 'active', isDefault: true },
      { name: 'Business', code: 'business', description: 'Business company plan', billingType: 'monthly', monthlyPrice: 0, yearlyPrice: 0, maxUsers: 100, maxWarehouses: 10, maxVehicles: 20, includedModules: Object.keys(MODULE_CATALOG), includedFeatures: ['runtime_dashboards','document_templates','mobile_access'], status: 'active', isDefault: false },
    ], { ordered: false }).catch(() => undefined);
  }

  const presetCount = await DocumentTemplatePreset.countDocuments();
  if (!presetCount) {
    await DocumentTemplatePreset.insertMany([
      {
        documentType: 'invoice', templateCode: 'invoice_standard', templateName: 'Standard Invoice',
        description: 'Default invoice layout', layoutVariant: 'standard',
        styleConfig: { headerAlignment: 'left', showLogo: true, primaryColor: '#10b981' },
        headerConfig: { title: 'Invoice', subtitle: 'Tax Invoice' },
        footerConfig: { customText: 'Thank you for your business.', showSignatureLine: true }, isActive: true,
      },
      {
        documentType: 'invoice', templateCode: 'invoice_compact', templateName: 'Compact Invoice',
        description: 'Compact invoice layout', layoutVariant: 'compact',
        styleConfig: { headerAlignment: 'left', showLogo: true, primaryColor: '#10b981' },
        headerConfig: { title: 'Invoice' }, footerConfig: { customText: 'System generated invoice.' }, isActive: true,
      },
      {
        documentType: 'receipt', templateCode: 'receipt_standard', templateName: 'Standard Receipt',
        description: 'Default receipt layout', layoutVariant: 'standard',
        styleConfig: { headerAlignment: 'left', showLogo: true, primaryColor: '#10b981' },
        headerConfig: { title: 'Receipt' }, footerConfig: { customText: 'Payment received.' }, isActive: true,
      },
      {
        documentType: 'receipt', templateCode: 'receipt_compact', templateName: 'Compact Receipt',
        description: 'Compact receipt layout', layoutVariant: 'compact',
        styleConfig: { headerAlignment: 'left', showLogo: true, primaryColor: '#10b981' },
        headerConfig: { title: 'Receipt' }, footerConfig: { customText: 'System generated receipt.' }, isActive: true,
      },
    ], { ordered: false }).catch(() => undefined);
  }
}

module.exports = { buildAuditContext, fireAndForgetAudit, ensureCompanyOrThrow, slugify, generateUniqueCompanySlug, ensurePlatformSeedData };
