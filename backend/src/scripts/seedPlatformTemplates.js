const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config();

const { connectDB } = require("../src/db");
const HierarchyTemplate = require("../src/models/HierarchyTemplate");
const RoleTemplate = require("../src/models/RoleTemplate");
const ModuleTemplate = require("../src/models/ModuleTemplate");

const hierarchyTemplates = [
  {
    name: "Standard FMCG Hierarchy",
    code: "standard_fmcg",
    description: "Region to field hierarchy for FMCG operations.",
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
    description: "Simplified region to field hierarchy for basic sales teams.",
    levels: [
      { key: "region", label: "Region", order: 1 },
      { key: "territory", label: "Territory", order: 2 },
      { key: "field", label: "Field", order: 3 },
    ],
    isActive: true,
  },
];

const roles = [
  ["Company Admin", "company_admin", true, ["standard_fmcg", "simple_sales"]],
  ["CEO", "ceo", false, []],
  ["Managing Director", "managing_director", false, []],
  ["HR Assitant", "hr_assitant", false, []],
  ["Cashier", "cashier", false, []],
  ["KPO", "kpo", false, []],
  ["National Sale Manager", "national_sale_manager", false, ["standard_fmcg"]],
  ["Regional Sale Manager", "regional_sale_manager", false, ["standard_fmcg", "simple_sales"]],
  ["Zone Sale Manager", "zone_sale_manager", false, ["standard_fmcg"]],
  ["Territory Sale Manager", "territory_sale_manager", false, ["standard_fmcg", "simple_sales"]],
  ["Field Sale Manager", "field_sale_manager", false, ["standard_fmcg", "simple_sales"]],
  ["Delivery Boy", "delivery_boy", false, ["standard_fmcg", "simple_sales"]],
  ["Brand Manager", "brand_manager", false, []],
  ["Warehouse Manager", "warehouse_manager", false, ["standard_fmcg", "simple_sales"]],
  ["Distributor", "distributor", false, ["standard_fmcg", "simple_sales"]],
  ["Salesman", "salesman", false, ["standard_fmcg", "simple_sales"]],
  ["Order Booker", "order_booker", false, ["standard_fmcg", "simple_sales"]],
  ["Customer", "customer", false, []],
  ["Account Officer", "account_officer", false, []],
];

const roleTemplates = roles.map(([name, code, isMandatory, applicableHierarchyCodes]) => ({
  name,
  code,
  description: `${name} role template`,
  applicableHierarchyCodes,
  isMandatory,
  isActive: true,
}));

const moduleTemplates = [
  {
    name: "Territory & Assets",
    code: "territory_assets",
    category: "operations",
    sections: ["regions", "zones", "territories", "fields", "assets"],
  },
  {
    name: "HR & Role Management",
    code: "hr_role_management",
    category: "administration",
    sections: ["users", "roles", "attendance", "policies"],
  },
  { name: "Products Management", code: "products_management", category: "operations", sections: ["catalog", "categories", "pricing"] },
  { name: "Warehouse & Inventory", code: "warehouse_inventory", category: "operations", sections: ["warehouses", "stock", "transfers"] },
  { name: "Account Management", code: "account_management", category: "finance", sections: ["accounts", "ledgers", "transactions"] },
  {
    name: "Order Management",
    code: "order_management",
    category: "operations",
    sections: ["primary_orders", "secondary_orders", "return_orders", "dispatch_orders", "delivered_orders"],
  },
  { name: "Expense Management", code: "expense_management", category: "finance", sections: ["claims", "approvals", "reimbursements"] },
  { name: "Finance & Accounts", code: "finance_accounts", category: "finance", sections: ["invoices", "receipts", "payments"] },
  { name: "Vehicle Management", code: "vehicle_management", category: "logistics", sections: ["fleet", "trips", "maintenance"] },
  { name: "Reports", code: "reports", category: "analytics", sections: ["sales_reports", "inventory_reports", "financial_reports"] },
  { name: "Procurement", code: "procurement", category: "operations", sections: ["suppliers", "purchase_orders", "goods_receipt"] },
  {
    name: "Distribution & Logistics",
    code: "distribution_logistics",
    category: "logistics",
    sections: ["dispatch", "delivery_routes", "delivery_status"],
  },
  { name: "Quality & Compliance", code: "quality_compliance", category: "governance", sections: ["audits", "quality_checks", "incidents"] },
  { name: "Messages", code: "messages", category: "communication", sections: ["inbox", "broadcast", "alerts"] },
  { name: "User Live Tracking", code: "user_live_tracking", category: "monitoring", sections: ["map", "timeline", "route_history"] },
  { name: "Settings", code: "settings", category: "administration", sections: ["company_settings", "preferences", "integrations"] },
].map((moduleTemplate) => ({
  ...moduleTemplate,
  description: `${moduleTemplate.name} module template`,
  types: ["type_1"],
  supportedActions: ["create", "read", "update", "delete", "approve", "reject", "dispatch", "delivered", "veiw"],
  isActive: true,
}));

async function seed() {
  await connectDB(process.env.MONGODB_URI);

  for (const template of hierarchyTemplates) {
    await HierarchyTemplate.findOneAndUpdate({ code: template.code }, template, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
  }

  for (const template of roleTemplates) {
    await RoleTemplate.findOneAndUpdate({ code: template.code }, template, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
  }

  for (const template of moduleTemplates) {
    await ModuleTemplate.findOneAndUpdate({ code: template.code }, template, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });
  }

  console.log("Platform templates seeded successfully");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Failed to seed platform templates", error);
  process.exit(1);
});