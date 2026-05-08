export const ERP_TEMPLATES = [
  {
    key: "distribution_erp",
    name: "Distribution ERP",
    description: "Supplier → Company → Distributor → Customer flow with primary sales, secondary sales, credit, routes, delivery, and collections.",
    modules: ["dashboard", "roles", "users", "companies", "territory", "regions", "zones", "areas", "fields", "products", "customers", "suppliers", "warehouses", "sales-quotations", "primary-sales-orders", "secondary-sales-orders", "customer-orders", "customer-billing", "returns", "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "inventory", "warehouse", "finance", "receipts", "payments", "expenses", "operations", "fleet", "dispatches", "deliveries", "live-tracking", "notifications", "reports", "settings"],
    defaultRoles: ["Company Admin", "CEO", "Sales Manager", "Warehouse Manager", "Distributor", "Salesman", "Order Booker", "Delivery Boy", "Accountant"],
    mobileRoles: ["Salesman", "Order Booker", "Delivery Boy", "Warehouse Manager", "Distributor"],
  },
  {
    key: "trading_erp",
    name: "Trading ERP",
    description: "Import/export, purchase, sales, shipment, LC, landed cost, multi-currency, inventory and accounting workflow.",
    modules: ["dashboard", "roles", "users", "products", "customers", "suppliers", "warehouses", "sales-quotations", "primary-sales-orders", "customer-orders", "returns", "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "inventory", "warehouse", "finance", "receipts", "payments", "expenses", "trading", "notifications", "reports", "settings"],
    defaultRoles: ["Company Admin", "Trading Manager", "Import Officer", "Export Officer", "Purchase Manager", "Sales Manager", "Warehouse Manager", "Accountant"],
    mobileRoles: ["Warehouse Manager"],
  },
  {
    key: "manufacturing_erp",
    name: "Manufacturing ERP",
    description: "BOM, raw material, work orders, production, finished goods, quality control, costing and maintenance.",
    modules: ["dashboard", "roles", "users", "products", "customers", "suppliers", "warehouses", "sales-quotations", "primary-sales-orders", "returns", "procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts", "inventory", "warehouse", "finance", "receipts", "payments", "expenses", "manufacturing", "notifications", "reports", "settings"],
    defaultRoles: ["Company Admin", "Production Manager", "Production Supervisor", "Quality Manager", "Warehouse Manager", "Purchase Manager", "Accountant"],
    mobileRoles: ["Warehouse Manager", "Production Supervisor"],
  },
  {
    key: "retail_pos_erp",
    name: "Retail POS ERP",
    description: "Store inventory, POS billing, cashier shifts, barcode selling, returns, loyalty-ready receipts and daily cash reconciliation.",
    modules: ["dashboard", "roles", "users", "products", "customers", "suppliers", "warehouses", "retail-pos", "customer-orders", "customer-billing", "returns", "goods-receipts", "inventory", "warehouse", "finance", "receipts", "payments", "expenses", "notifications", "reports", "settings"],
    defaultRoles: ["Company Admin", "Store Manager", "Cashier", "Warehouse Manager", "Accountant"],
    mobileRoles: ["Store Manager"],
  },
  {
    key: "service_erp",
    name: "Service ERP",
    description: "Tickets, service orders, technicians, SLA, AMC contracts, customer assets, spare parts, service proof and billing.",
    modules: ["dashboard", "roles", "users", "customers", "products", "inventory", "finance", "receipts", "payments", "expenses", "service", "notifications", "reports", "settings"],
    defaultRoles: ["Company Admin", "Service Manager", "Service Agent", "Technician", "Accountant"],
    mobileRoles: ["Service Agent", "Technician"],
  },
  {
    key: "custom_erp",
    name: "Custom ERP",
    description: "Configurable ERP package where the SaaS owner enables exact modules, roles, reports and workflows for the client.",
    modules: ["dashboard", "roles", "users", "companies", "territory", "products", "customers", "suppliers", "warehouses", "sales-quotations", "primary-sales-orders", "secondary-sales-orders", "procurement", "purchase-requests", "purchase-orders", "goods-receipts", "retail-pos", "manufacturing", "service", "trading", "operations", "fleet", "dispatches", "deliveries", "live-tracking", "inventory", "warehouse", "finance", "notifications", "reports", "settings"],
    defaultRoles: ["Company Admin"],
    mobileRoles: [],
  },
];

export function getErpTemplateByKey(key) {
  return ERP_TEMPLATES.find((template) => template.key === key) || ERP_TEMPLATES[0];
}

export default ERP_TEMPLATES;
