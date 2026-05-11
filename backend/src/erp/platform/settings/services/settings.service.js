const PlatformSetting = require("../models/PlatformSetting");
const Company = require("../../companies/models/Company");
const { APP_BRAND } = require("../../../../config/brand");

const SECTION_KEYS = ["companyProfile", "portal", "documents", "uploads", "security", "notifications", "integrations"];

function text(value) {
  return String(value || "").trim();
}

function lower(value) {
  return text(value).toLowerCase();
}

function isSystemAdmin(user = {}) {
  const role = lower(user.role || user.roleName);
  return ["admin", "system admin", "super admin"].includes(role) || lower(user.portalType) === "system_admin" || lower(user.roleKey) === "super_admin";
}

function isCompanyAdmin(user = {}) {
  const role = lower(user.role || user.roleName);
  return role === "company admin" || lower(user.portalType) === "company_admin" || lower(user.roleKey) === "company_admin";
}

function assertCanEditSettings(actor = {}) {
  if (isSystemAdmin(actor) || isCompanyAdmin(actor)) return;
  throw new Error("Forbidden: only System Admin or Company Admin can change settings");
}

function resolveScope(actor = {}, requestedCompanyId = "") {
  if (isSystemAdmin(actor)) {
    const companyId = text(requestedCompanyId || actor.companyId || "__system__") || "__system__";
    return { companyId, scope: companyId === "__system__" ? "system" : "company" };
  }
  const companyId = text(actor.companyId);
  if (!companyId) throw new Error("Company context is required for settings");
  return { companyId, scope: "company" };
}

function sanitizeArray(value, fallback = []) {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  if (typeof value === "string") return value.split(",").map(text).filter(Boolean);
  return fallback;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  return fallback;
}

function normalizeSection(section, value = {}) {
  const payload = value || {};
  if (section === "companyProfile") {
    return {
      displayName: text(payload.displayName) || APP_BRAND.name,
      legalName: text(payload.legalName),
      email: lower(payload.email) || APP_BRAND.email,
      phone: text(payload.phone) || APP_BRAND.phone,
      whatsapp: text(payload.whatsapp) || APP_BRAND.whatsapp,
      website: text(payload.website) || APP_BRAND.website,
      taxNumber: text(payload.taxNumber),
      registrationNumber: text(payload.registrationNumber),
      address: text(payload.address),
      city: text(payload.city),
      country: text(payload.country) || "Pakistan",
      logoUrl: text(payload.logoUrl),
      stampUrl: text(payload.stampUrl),
    };
  }
  if (section === "portal") {
    return {
      defaultLandingPath: text(payload.defaultLandingPath) || "/portals",
      primaryColor: text(payload.primaryColor) || "emerald",
      sidebarStyle: text(payload.sidebarStyle) || "dark",
      defaultLanguage: text(payload.defaultLanguage) || "en",
      timezone: text(payload.timezone) || "Asia/Karachi",
      currency: text(payload.currency) || "PKR",
      fiscalYearStartMonth: Math.min(12, Math.max(1, toNumber(payload.fiscalYearStartMonth, 7))),
      dateFormat: text(payload.dateFormat) || "DD/MM/YYYY",
      enableMobileApp: toBoolean(payload.enableMobileApp, true),
      enableCustomerPortal: toBoolean(payload.enableCustomerPortal, true),
      enableSupplierPortal: toBoolean(payload.enableSupplierPortal, true),
    };
  }
  if (section === "documents") {
    return {
      invoicePrefix: text(payload.invoicePrefix) || "INV",
      receiptPrefix: text(payload.receiptPrefix) || "RCT",
      purchasePrefix: text(payload.purchasePrefix) || "PO",
      deliveryPrefix: text(payload.deliveryPrefix) || "DN",
      quotationPrefix: text(payload.quotationPrefix) || "QT",
      nextInvoiceNumber: Math.max(1, toNumber(payload.nextInvoiceNumber, 1)),
      nextReceiptNumber: Math.max(1, toNumber(payload.nextReceiptNumber, 1)),
      printPaperSize: text(payload.printPaperSize) || "A4",
      printMode: text(payload.printMode) || "professional",
      showLogoOnPrint: toBoolean(payload.showLogoOnPrint, true),
      showStampOnPrint: toBoolean(payload.showStampOnPrint, false),
      showTaxOnPrint: toBoolean(payload.showTaxOnPrint, true),
      invoiceTerms: text(payload.invoiceTerms),
      receiptFooter: text(payload.receiptFooter),
      deliveryFooter: text(payload.deliveryFooter),
    };
  }
  if (section === "uploads") {
    return {
      storageProvider: text(payload.storageProvider) || "cloudflare_r2",
      publicBaseUrl: text(payload.publicBaseUrl) || APP_BRAND.publicFileBaseUrl || "",
      maxFileSizeMb: Math.max(1, toNumber(payload.maxFileSizeMb, 10)),
      allowedImageTypes: sanitizeArray(payload.allowedImageTypes, ["image/jpeg", "image/png", "image/webp"]),
      allowedDocumentTypes: sanitizeArray(payload.allowedDocumentTypes, ["application/pdf", "image/jpeg", "image/png", "image/webp"]),
      requireUserDocument: toBoolean(payload.requireUserDocument, false),
      requirePaymentProof: toBoolean(payload.requirePaymentProof, false),
      requireProofOfDelivery: toBoolean(payload.requireProofOfDelivery, true),
      allowInvoiceAttachments: toBoolean(payload.allowInvoiceAttachments, true),
      allowReceiptAttachments: toBoolean(payload.allowReceiptAttachments, true),
      allowVehicleProofs: toBoolean(payload.allowVehicleProofs, true),
    };
  }
  if (section === "security") {
    return {
      minPasswordLength: Math.max(4, toNumber(payload.minPasswordLength, 8)),
      requireStrongPassword: toBoolean(payload.requireStrongPassword, true),
      sessionTimeoutMinutes: Math.max(15, toNumber(payload.sessionTimeoutMinutes, 10080)),
      allowRememberMe: toBoolean(payload.allowRememberMe, true),
      loginAttemptLimit: Math.max(1, toNumber(payload.loginAttemptLimit, 5)),
      requireTwoFactor: toBoolean(payload.requireTwoFactor, false),
      auditRetentionDays: Math.max(30, toNumber(payload.auditRetentionDays, 365)),
    };
  }
  if (section === "notifications") {
    return {
      senderName: text(payload.senderName) || APP_BRAND.name,
      senderEmail: lower(payload.senderEmail) || APP_BRAND.email,
      whatsappNumber: text(payload.whatsappNumber) || APP_BRAND.whatsapp,
      emailProvider: text(payload.emailProvider) || "smtp",
      smsProvider: text(payload.smsProvider) || "manual",
      whatsappProvider: text(payload.whatsappProvider) || "manual",
      notifyOnOrderCreated: toBoolean(payload.notifyOnOrderCreated, true),
      notifyOnPaymentReceived: toBoolean(payload.notifyOnPaymentReceived, true),
      notifyOnLowStock: toBoolean(payload.notifyOnLowStock, true),
      notifyOnDelivery: toBoolean(payload.notifyOnDelivery, true),
    };
  }
  if (section === "integrations") {
    return {
      cloudflareR2Enabled: toBoolean(payload.cloudflareR2Enabled, true),
      mongodbAtlasEnabled: toBoolean(payload.mongodbAtlasEnabled, true),
      mongodbAtlasClusterName: text(payload.mongodbAtlasClusterName),
      googleMapsEnabled: toBoolean(payload.googleMapsEnabled, false),
      paymentGateway: text(payload.paymentGateway) || "manual",
      backupSchedule: text(payload.backupSchedule) || "daily",
      backupRetentionDays: Math.max(1, toNumber(payload.backupRetentionDays, 30)),
    };
  }
  return payload;
}

function defaultSettings({ companyId, scope }) {
  return {
    companyId,
    scope,
    companyProfile: normalizeSection("companyProfile", {}),
    portal: normalizeSection("portal", {}),
    documents: normalizeSection("documents", {}),
    uploads: normalizeSection("uploads", {}),
    security: normalizeSection("security", {}),
    notifications: normalizeSection("notifications", {}),
    integrations: normalizeSection("integrations", {}),
  };
}

async function ensureSettings(actor = {}, requestedCompanyId = "") {
  const target = resolveScope(actor, requestedCompanyId);
  let settings = await PlatformSetting.findOne(target).lean();
  if (settings) return settings;

  const defaults = defaultSettings(target);
  if (target.scope === "company") {
    const company = await Company.findOne({ companyId: target.companyId }).lean();
    if (company) {
      defaults.companyProfile.displayName = company.name || defaults.companyProfile.displayName;
      defaults.companyProfile.legalName = company.name || defaults.companyProfile.legalName;
      defaults.companyProfile.email = company.email || defaults.companyProfile.email;
      defaults.companyProfile.phone = company.phone1 || defaults.companyProfile.phone;
      defaults.companyProfile.address = company.mainOfficeAddress || defaults.companyProfile.address;
      defaults.portal.primaryColor = company.portalTheme?.primary || defaults.portal.primaryColor;
    }
  }

  settings = await PlatformSetting.create(defaults);
  return settings.toObject();
}

async function getSettings(actor = {}, query = {}) {
  return ensureSettings(actor, query.companyId);
}

async function updateSettings(actor = {}, query = {}, payload = {}) {
  assertCanEditSettings(actor);
  const target = resolveScope(actor, query.companyId || payload.companyId);
  await ensureSettings(actor, target.companyId);
  const update = { updatedBy: text(actor.uid || actor._id || actor.username) };
  for (const key of SECTION_KEYS) {
    if (payload[key] !== undefined) update[key] = normalizeSection(key, payload[key]);
  }
  const settings = await PlatformSetting.findOneAndUpdate(target, { $set: update }, { new: true, runValidators: true }).lean();

  if (target.scope === "company" && payload.companyProfile) {
    const profile = normalizeSection("companyProfile", payload.companyProfile);
    await Company.updateOne(
      { companyId: target.companyId },
      {
        $set: {
          name: profile.displayName || profile.legalName || APP_BRAND.name,
          email: profile.email,
          phone1: profile.phone,
          phone2: profile.whatsapp,
          mainOfficeAddress: profile.address,
          systemName: profile.displayName || APP_BRAND.name,
        },
      }
    ).catch(() => null);
  }

  if (target.scope === "company" && payload.portal) {
    await Company.updateOne(
      { companyId: target.companyId },
      { $set: { "portalTheme.primary": settings.portal?.primaryColor || "emerald", "portalTheme.sidebar": settings.portal?.sidebarStyle || "dark" } }
    ).catch(() => null);
  }

  return settings;
}

async function updateSection(actor = {}, query = {}, section = "", payload = {}) {
  if (!SECTION_KEYS.includes(section)) throw new Error("Invalid settings section");
  return updateSettings(actor, query, { [section]: payload });
}

module.exports = { getSettings, updateSettings, updateSection, SECTION_KEYS };
