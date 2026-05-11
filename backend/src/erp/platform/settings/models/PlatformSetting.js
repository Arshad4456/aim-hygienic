const mongoose = require("mongoose");
const { APP_BRAND } = require("../../../../config/brand");

const CompanyProfileSchema = new mongoose.Schema(
  {
    displayName: { type: String, trim: true, default: () => APP_BRAND.name },
    legalName: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: () => APP_BRAND.email },
    phone: { type: String, trim: true, default: () => APP_BRAND.phone },
    whatsapp: { type: String, trim: true, default: () => APP_BRAND.whatsapp },
    website: { type: String, trim: true, default: () => APP_BRAND.website },
    taxNumber: { type: String, trim: true, default: "" },
    registrationNumber: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "Pakistan" },
    logoUrl: { type: String, trim: true, default: () => APP_BRAND.logoUrl || "" },
    stampUrl: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const PortalSettingsSchema = new mongoose.Schema(
  {
    defaultLandingPath: { type: String, trim: true, default: "/portals" },
    primaryColor: { type: String, trim: true, default: "emerald" },
    sidebarStyle: { type: String, trim: true, default: "dark" },
    defaultLanguage: { type: String, trim: true, default: "en" },
    timezone: { type: String, trim: true, default: "Asia/Karachi" },
    currency: { type: String, trim: true, default: "PKR" },
    fiscalYearStartMonth: { type: Number, default: 7 },
    dateFormat: { type: String, trim: true, default: "DD/MM/YYYY" },
    enableMobileApp: { type: Boolean, default: true },
    enableCustomerPortal: { type: Boolean, default: true },
    enableSupplierPortal: { type: Boolean, default: true },
  },
  { _id: false }
);

const DocumentSettingsSchema = new mongoose.Schema(
  {
    invoicePrefix: { type: String, trim: true, default: "INV" },
    receiptPrefix: { type: String, trim: true, default: "RCT" },
    purchasePrefix: { type: String, trim: true, default: "PO" },
    deliveryPrefix: { type: String, trim: true, default: "DN" },
    quotationPrefix: { type: String, trim: true, default: "QT" },
    nextInvoiceNumber: { type: Number, default: 1 },
    nextReceiptNumber: { type: Number, default: 1 },
    printPaperSize: { type: String, trim: true, default: "A4" },
    printMode: { type: String, trim: true, default: "professional" },
    showLogoOnPrint: { type: Boolean, default: true },
    showStampOnPrint: { type: Boolean, default: false },
    showTaxOnPrint: { type: Boolean, default: true },
    invoiceTerms: { type: String, trim: true, default: "Payment is due according to the agreed credit terms." },
    receiptFooter: { type: String, trim: true, default: "Thank you for your payment." },
    deliveryFooter: { type: String, trim: true, default: "Received in good condition." },
  },
  { _id: false }
);

const UploadSettingsSchema = new mongoose.Schema(
  {
    storageProvider: { type: String, trim: true, default: "cloudflare_r2" },
    publicBaseUrl: { type: String, trim: true, default: () => APP_BRAND.publicFileBaseUrl || "" },
    maxFileSizeMb: { type: Number, default: 10 },
    allowedImageTypes: { type: [String], default: ["image/jpeg", "image/png", "image/webp"] },
    allowedDocumentTypes: { type: [String], default: ["application/pdf", "image/jpeg", "image/png", "image/webp"] },
    requireUserDocument: { type: Boolean, default: false },
    requirePaymentProof: { type: Boolean, default: false },
    requireProofOfDelivery: { type: Boolean, default: true },
    allowInvoiceAttachments: { type: Boolean, default: true },
    allowReceiptAttachments: { type: Boolean, default: true },
    allowVehicleProofs: { type: Boolean, default: true },
  },
  { _id: false }
);

const SecuritySettingsSchema = new mongoose.Schema(
  {
    minPasswordLength: { type: Number, default: 8 },
    requireStrongPassword: { type: Boolean, default: true },
    sessionTimeoutMinutes: { type: Number, default: 10080 },
    allowRememberMe: { type: Boolean, default: true },
    loginAttemptLimit: { type: Number, default: 5 },
    requireTwoFactor: { type: Boolean, default: false },
    auditRetentionDays: { type: Number, default: 365 },
  },
  { _id: false }
);

const NotificationSettingsSchema = new mongoose.Schema(
  {
    senderName: { type: String, trim: true, default: () => APP_BRAND.name },
    senderEmail: { type: String, trim: true, lowercase: true, default: () => APP_BRAND.email },
    whatsappNumber: { type: String, trim: true, default: () => APP_BRAND.whatsapp },
    emailProvider: { type: String, trim: true, default: "smtp" },
    smsProvider: { type: String, trim: true, default: "manual" },
    whatsappProvider: { type: String, trim: true, default: "manual" },
    notifyOnOrderCreated: { type: Boolean, default: true },
    notifyOnPaymentReceived: { type: Boolean, default: true },
    notifyOnLowStock: { type: Boolean, default: true },
    notifyOnDelivery: { type: Boolean, default: true },
  },
  { _id: false }
);

const IntegrationSettingsSchema = new mongoose.Schema(
  {
    cloudflareR2Enabled: { type: Boolean, default: true },
    mongodbAtlasEnabled: { type: Boolean, default: true },
    mongodbAtlasClusterName: { type: String, trim: true, default: "" },
    googleMapsEnabled: { type: Boolean, default: false },
    paymentGateway: { type: String, trim: true, default: "manual" },
    backupSchedule: { type: String, trim: true, default: "daily" },
    backupRetentionDays: { type: Number, default: 30 },
  },
  { _id: false }
);

const PlatformSettingSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, default: "__system__", index: true },
    scope: { type: String, enum: ["system", "company"], default: "company", index: true },
    companyProfile: { type: CompanyProfileSchema, default: () => ({}) },
    portal: { type: PortalSettingsSchema, default: () => ({}) },
    documents: { type: DocumentSettingsSchema, default: () => ({}) },
    uploads: { type: UploadSettingsSchema, default: () => ({}) },
    security: { type: SecuritySettingsSchema, default: () => ({}) },
    notifications: { type: NotificationSettingsSchema, default: () => ({}) },
    integrations: { type: IntegrationSettingsSchema, default: () => ({}) },
    updatedBy: { type: String, trim: true },
  },
  { timestamps: true }
);

PlatformSettingSchema.index({ companyId: 1, scope: 1 }, { unique: true });

module.exports = mongoose.models.PlatformSetting || mongoose.model("PlatformSetting", PlatformSettingSchema);
