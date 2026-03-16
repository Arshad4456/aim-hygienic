const HierarchyTemplate = require("../models/HierarchyTemplate");
const RoleTemplate = require("../models/RoleTemplate");
const ModuleTemplate = require("../models/ModuleTemplate");
const DocumentTemplatePreset = require("../models/DocumentTemplatePreset");

const HIERARCHIES = [
  {
    name: "Standard FMCG Hierarchy",
    code: "standard_fmcg",
    description: "Region → Zone → Territory → Field hierarchy for FMCG operations.",
    levels: [
      { key: "region", label: "Region", order: 1 },
      { key: "zone", label: "Zone", order: 2 },
      { key: "territory", label: "Territory", order: 3 },
      { key: "field", label: "Field", order: 4 },
    ],
    isActive: true,
  },
  {
    name: "Simple Sales Hierarchy",
    code: "simple_sales",
    description: "Region → Territory → Field hierarchy for lightweight sales teams.",
    levels: [
      { key: "region", label: "Region", order: 1 },
      { key: "territory", label: "Territory", order: 2 },
      { key: "field", label: "Field", order: 3 },
    ],
    isActive: true,
  },
];

const ROLES = [
  ["Company Admin", "company_admin", true, ["standard_fmcg", "simple_sales"]],
  ["Warehouse Manager", "warehouse_manager", false, ["standard_fmcg", "simple_sales"]],
  ["Distributor", "distributor", false, ["standard_fmcg", "simple_sales"]],
  ["Salesman", "salesman", false, ["standard_fmcg", "simple_sales"]],
  ["Order Booker", "order_booker", false, ["standard_fmcg", "simple_sales"]],
  ["Customer", "customer", false, ["standard_fmcg", "simple_sales"]],
  ["Account Officer", "account_officer", false, ["standard_fmcg", "simple_sales"]],
  ["Delivery Boy", "delivery_boy", false, ["standard_fmcg", "simple_sales"]],
  ["Brand Manager", "brand_manager", false, ["standard_fmcg", "simple_sales"]],
  ["Regional Sale Manager", "regional_sale_manager", false, ["standard_fmcg", "simple_sales"]],
  ["Zone Sale Manager", "zone_sale_manager", false, ["standard_fmcg"]],
  ["Territory Sale Manager", "territory_sale_manager", false, ["standard_fmcg", "simple_sales"]],
];

const MODULES = [
  {
    name: "Territory & Assets",
    code: "territory_assets",
    category: "operations",
    sections: ["regions", "zones", "territories", "fields", "assets", "vehicles"],
    supportedActions: ["create", "read", "update", "delete", "assign"],
  },
  {
    name: "HR & Role Management",
    code: "hr_role_management",
    category: "administration",
    sections: ["users", "roles", "attendance", "policies"],
    supportedActions: ["create", "read", "update", "delete", "assign"],
  },
  {
    name: "Order Management",
    code: "order_management",
    category: "operations",
    types: ["type_1"],
    subtypes: ["primary_order", "secondary_order"],
    sections: ["primary_orders", "secondary_orders", "approvals", "dispatch", "returns", "sales_orders"],
    supportedActions: ["create", "read", "update", "delete", "approve", "reject", "dispatch", "deliver"],
  },
  {
    name: "Payment Management",
    code: "payment_management",
    category: "finance",
    types: ["type_1"],
    subtypes: ["primary_payment", "secondary_payment"],
    sections: ["payments", "primary", "secondary", "ledger"],
    supportedActions: ["create", "read", "update", "delete", "approve", "reject"],
  },
  {
    name: "Expense Management",
    code: "expense_management",
    category: "finance",
    sections: ["overview", "personal", "daily", "distributor"],
    supportedActions: ["create", "read", "update", "delete", "approve"],
  },
  {
    name: "Finance & Accounts",
    code: "finance_accounts",
    category: "finance",
    sections: ["invoices", "receipts", "aging", "payments"],
    supportedActions: ["create", "read", "update", "delete", "approve", "print", "export"],
  },
  {
    name: "Vehicle Management",
    code: "vehicle_management",
    category: "logistics",
    sections: ["vehicles", "fuel_management", "maintenance", "trips"],
    supportedActions: ["create", "read", "update", "delete", "upload_proof"],
  },
  {
    name: "Messages",
    code: "messages",
    category: "communication",
    sections: ["inbox", "broadcast"],
    supportedActions: ["create", "read", "delete"],
  },
  {
    name: "Settings",
    code: "settings",
    category: "administration",
    sections: ["profile", "change_password", "preferences"],
    supportedActions: ["read", "update"],
  },
];

const DOCUMENT_PRESETS = [
  { documentType: "invoice", templateCode: "invoice_standard", templateName: "Standard Invoice", layoutVariant: "standard", styleConfig: { primaryColor: "#10b981", showLogo: true }, headerConfig: { title: "Invoice" }, footerConfig: { customText: "System generated invoice" }, isActive: true },
  { documentType: "receipt", templateCode: "receipt_standard", templateName: "Standard Receipt", layoutVariant: "standard", styleConfig: { primaryColor: "#10b981", showLogo: true }, headerConfig: { title: "Receipt" }, footerConfig: { customText: "System generated receipt" }, isActive: true },
];

async function ensureHierarchyTemplates() {
  const count = await HierarchyTemplate.countDocuments();
  if (count) return;
  await Promise.all(HIERARCHIES.map((item) => HierarchyTemplate.findOneAndUpdate({ code: item.code }, item, { upsert: true, new: true, setDefaultsOnInsert: true })));
}

async function ensureRoleTemplates() {
  const count = await RoleTemplate.countDocuments();
  if (count) return;
  await Promise.all(ROLES.map(([name, code, isMandatory, applicableHierarchyCodes]) => RoleTemplate.findOneAndUpdate(
    { code },
    { name, code, description: `${name} role template`, applicableHierarchyCodes, isMandatory, isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )));
}

async function ensureModuleTemplates() {
  const count = await ModuleTemplate.countDocuments();
  if (count) return;
  await Promise.all(MODULES.map((item) => ModuleTemplate.findOneAndUpdate(
    { code: item.code },
    { ...item, description: `${item.name} module template`, types: item.types || ["type_1"], subtypes: item.subtypes || [], sections: item.sections || [], supportedActions: item.supportedActions || ["create", "read", "update", "delete"], isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )));
}

async function ensureDocumentPresets() {
  const count = await DocumentTemplatePreset.countDocuments();
  if (count) return;
  await Promise.all(DOCUMENT_PRESETS.map((item) => DocumentTemplatePreset.findOneAndUpdate(
    { templateCode: item.templateCode },
    item,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )));
}

async function ensurePlatformTemplates() {
  await ensureHierarchyTemplates();
  await ensureRoleTemplates();
  await ensureModuleTemplates();
  await ensureDocumentPresets();
}

module.exports = { ensurePlatformTemplates, ensureHierarchyTemplates, ensureRoleTemplates, ensureModuleTemplates, ensureDocumentPresets };
