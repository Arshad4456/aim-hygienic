import { resolveRoleDefinition } from "./roleRegistry";

export const ADMIN_NAVIGATION_GROUPS = [
  {
    type: "group",
    key: "dashboard",
    title: "Dashboard",
    icon: "dashboard",
    children: [
      { title: "Dashboard Overview", href: "/dashboards/admin" },
      { title: "Operations Command Center", href: "/dashboards/admin/operations" },
      { title: "Sales KPI", href: "/dashboards/admin/sales-kpi" },
    ],
  },
  {
    type: "group",
    key: "company",
    title: "Company Management",
    icon: "account",
    requiresSystemAdmin: true,
    children: [
      { title: "Add New Company", href: "/dashboards/admin/companies/add" },
      { title: "Company List", href: "/dashboards/admin/companies" },
    ],
  },
  {
    type: "group",
    key: "hr",
    title: "HR & Role Management",
    icon: "hr",
    children: [
      { title: "Module Overview", href: "/dashboards/admin/hr" },
      { title: "Add User", href: "/dashboards/admin/users/add" },
      { title: "User List", href: "/dashboards/admin/users" },
      { title: "Module Access Control", href: "/dashboards/admin/module-access", requiresSystemAdmin: true },
    ],
  },
  {
    type: "group",
    key: "products",
    title: "Products Management",
    icon: "products",
    children: [
      { title: "Add New Product", href: "/dashboards/admin/products/add" },
      { title: "View Product List", href: "/dashboards/admin/products" },
      { title: "Product Barcode List", href: "/dashboards/admin/products/barcodes" },
      { title: "Price Change", href: "/dashboards/admin/products/price-change" },
    ],
  },
  {
    type: "group",
    key: "inventory",
    title: "Warehouse & Inventory",
    icon: "inventory",
    children: [
      { title: "Module Overview", href: "/dashboards/admin/warehouse-inventory" },
      { title: "Warehouse Master", href: "/dashboards/admin/inventory/warehouses" },
      { title: "Inventory Ledger", href: "/dashboards/admin/inventory/ledger" },
      { title: "Stock Transfers", href: "/dashboards/admin/inventory/transfers" },
      { title: "Stock Summary", href: "/dashboards/admin/inventory/summary" },
      { title: "Low Stock Alerts", href: "/dashboards/admin/inventory/low-stock" },
      { title: "Near Expiry", href: "/dashboards/admin/inventory/near-expiry" },
    ],
  },
  {
    type: "group",
    key: "territory",
    title: "Territory & Assets",
    icon: "territory",
    children: [
      { title: "Add Warehouse", href: "/dashboards/admin/warehouses/add" },
      { title: "Warehouse List", href: "/dashboards/admin/warehouses" },
      { title: "Add Region", href: "/dashboards/admin/regions/add" },
      { title: "Region List", href: "/dashboards/admin/regions" },
      { title: "Add Zone", href: "/dashboards/admin/zones/add" },
      { title: "Zone List", href: "/dashboards/admin/zones" },
      { title: "Add Territory", href: "/dashboards/admin/areas/add" },
      { title: "Territory List", href: "/dashboards/admin/areas" },
      { title: "Add Field", href: "/dashboards/admin/fields/add" },
      { title: "Field List", href: "/dashboards/admin/fields" },
      { title: "Add Vehicle", href: "/dashboards/admin/assets/vehicles/add" },
      { title: "Vehicle List", href: "/dashboards/admin/assets/vehicles" },
    ],
  },
  {
    type: "group",
    key: "orders",
    title: "Order Management",
    icon: "orders",
    children: [
      { title: "Module Overview", href: "/dashboards/admin/order-management" },
      { title: "Sales Orders", href: "/dashboards/admin/order-management/sales-orders" },
      { title: "Order Approvals", href: "/dashboards/admin/order-management/approvals" },
      { title: "Pick & Dispatch", href: "/dashboards/admin/order-management/dispatch" },
      { title: "Returns & Claims", href: "/dashboards/admin/order-management/returns" },
    ],
  },
  {
    type: "group",
    key: "vehicleManagement",
    title: "Vehicle Management",
    icon: "vehicle",
    children: [
      { title: "Module Overview", href: "/dashboards/admin/vehicle-management" },
      { title: "Add Vehicle", href: "/dashboards/admin/vehicle-management/add" },
      { title: "Vehicle List", href: "/dashboards/admin/vehicle-management/vehicles" },
      { title: "Fuel Management", href: "/dashboards/admin/vehicle-management/fuel-management" },
      { title: "Vehicle Maintenance", href: "/dashboards/admin/vehicle-management/maintenance" },
    ],
  },
  {
    type: "group",
    key: "accountManagement",
    title: "Account Management",
    icon: "account",
    children: [
      { title: "Account Detail", href: "/dashboards/admin/account/manage" },
      { title: "Loan Detail", href: "/dashboards/admin/account/loan-detail" },
      { title: "Payment Management", href: "/dashboards/admin/finance/payments" },
    ],
  },
  {
    type: "group",
    key: "finance",
    title: "Finance & Accounts",
    icon: "finance",
    children: [
      { title: "Module Overview", href: "/dashboards/admin/finance" },
      { title: "Invoices", href: "/dashboards/admin/finance/invoices" },
      { title: "Receipts", href: "/dashboards/admin/finance/receipts" },
      { title: "Aging Report", href: "/dashboards/admin/finance/aging" },
    ],
  },
  {
    type: "group",
    key: "expense",
    title: "Expense Management",
    icon: "expense",
    children: [
      { title: "Module Overview", href: "/dashboards/admin/expense" },
      { title: "AIM – Personal Expense", href: "/dashboards/admin/expense/personal" },
      { title: "Daily Expense", href: "/dashboards/admin/expense/daily" },
      { title: "Distributor Expense", href: "/dashboards/admin/expense/distributor" },
    ],
  },
  {
    type: "group",
    key: "procurement",
    title: "Procurement",
    icon: "purchase",
    children: [
      { title: "Module Overview", href: "/dashboards/admin/procurement" },
      { title: "Supplier Master", href: "/dashboards/admin/procurement/suppliers" },
      { title: "Purchase Orders", href: "/dashboards/admin/procurement/purchase-orders" },
      { title: "Goods Receipt (GRN)", href: "/dashboards/admin/procurement/grn" },
      { title: "Supplier Payments", href: "/dashboards/admin/procurement/payments" },
    ],
  },
  {
    type: "group",
    key: "logistics",
    title: "Distribution & Logistics",
    icon: "logistics",
    children: [
      { title: "Module Overview", href: "/dashboards/admin/logistics" },
      { title: "Route Planning", href: "/dashboards/admin/logistics/routes" },
      { title: "Dispatch & Delivery", href: "/dashboards/admin/logistics/dispatch" },
      { title: "Vehicle Assignment", href: "/dashboards/admin/assets/vehicles" },
    ],
  },
  {
    type: "group",
    key: "qc",
    title: "Quality & Compliance",
    icon: "qc",
    children: [
      { title: "Module Overview", href: "/dashboards/admin/quality" },
      { title: "Raw Material QC", href: "/dashboards/admin/quality/raw-material" },
      { title: "Production QC", href: "/dashboards/admin/quality/production" },
      { title: "Finished Goods QC", href: "/dashboards/admin/quality/finished-goods" },
      { title: "Final Release QC", href: "/dashboards/admin/quality/final-release" },
    ],
  },
  { type: "link", title: "Messages", href: "/dashboards/admin/messages", icon: "messages" },
  { type: "link", title: "User Live Tracking", href: "/dashboards/admin/live-tracking", icon: "tracking" },
  { type: "link", title: "Reports", href: "/dashboards/admin/reports", icon: "reports" },
  { type: "link", title: "Settings", href: "/dashboards/admin/settings", icon: "settings" },
];

export const USER_ROLE_LINKS = {
  warehouseManager: [
    { title: "Dashboard", href: "/dashboards/warehouseManager" },
    { title: "Company Stock Summary", href: "/dashboards/warehouseManager/stock-summary" },
    { title: "Inward / Outward", href: "/dashboards/warehouseManager/inward-outward" },
    { title: "Goods Receipt Verification", href: "/dashboards/warehouseManager/goods-receipts" },
    { title: "Company Dispatch Preparation", href: "/dashboards/warehouseManager/dispatch-preparation" },
    { title: "Stock Adjustment", href: "/dashboards/warehouseManager/stock-adjustment" },
    { title: "Damage & Expiry", href: "/dashboards/warehouseManager/damage-expiry" },
    { title: "Warehouse & Inventory", href: "/dashboards/warehouseManager/warehouse-inventory" },
    { title: "Order Management", href: "/dashboards/warehouseManager/order-management" },
  ],
  distributor: [
    { title: "Dashboard", href: "/dashboards/distributor" },
    { title: "Inventory Dashboard", href: "/dashboards/distributor/inventory" },
    { title: "Stock Received", href: "/dashboards/distributor/stock-received" },
    { title: "Stock Availability", href: "/dashboards/distributor/stock-availability" },
    { title: "Stock Movements", href: "/dashboards/distributor/stock-movements" },
    { title: "Stock Adjustment", href: "/dashboards/distributor/stock-adjustment" },
    { title: "Damage & Expiry", href: "/dashboards/distributor/damage-expiry" },
    { title: "Secondary Orders", href: "/dashboards/distributor/orders" },
    { title: "Customer Receipts", href: "/dashboards/distributor/receipts" },
    { title: "Payable to Company", href: "/dashboards/distributor/payments" },
    { title: "Distributor Expense", href: "/dashboards/distributor/expense" },
    { title: "Primary Order Request", href: "/dashboards/distributor/primary-order-request" },
    { title: "Return Stock", href: "/dashboards/distributor/return-stock" },
    { title: "HR & Role Management", href: "/dashboards/distributor/hr" },
    { title: "User List", href: "/dashboards/distributor/users" },
    { title: "Reports", href: "/dashboards/distributor/reports" },
    { title: "Messages", href: "/dashboards/distributor/messages" },
    { title: "Live Tracking", href: "/dashboards/distributor/live-tracking" },
    { title: "Account Settings", href: "/dashboards/distributor/settings" },
    { title: "Change Password", href: "/dashboards/distributor/settings/change-password" },
  ],
  distributorStoreManager: [
    { title: "Inventory Dashboard", href: "/dashboards/distributor/inventory" },
    { title: "Stock Received", href: "/dashboards/distributor/stock-received" },
    { title: "Stock Availability", href: "/dashboards/distributor/stock-availability" },
    { title: "Stock Movements", href: "/dashboards/distributor/stock-movements" },
    { title: "Stock Adjustment", href: "/dashboards/distributor/stock-adjustment" },
    { title: "Damage & Expiry", href: "/dashboards/distributor/damage-expiry" },
    { title: "Return Stock", href: "/dashboards/distributor/return-stock" },
    { title: "Reports", href: "/dashboards/distributor/reports" },
  ],
  orderBooker: [
    { title: "Dashboard", href: "/dashboards/orderBooker" },
    { title: "Secondary Sale Requests", href: "/dashboards/orderBooker/orders" },
    { title: "Receipts", href: "/dashboards/orderBooker/receipts" },
  ],
  salesman: [
    { title: "Dashboard", href: "/dashboards/salesman" },
    { title: "Deliveries", href: "/dashboards/salesman/orders" },
  ],
  deliveryBoy: [
    { title: "Dashboard", href: "/dashboards/deliveryBoy" },
    { title: "Proof of Delivery", href: "/dashboards/deliveryBoy/orders" },
  ],
  customer: [
    { title: "Dashboard", href: "/dashboards/customer" },
    { title: "Order Requests", href: "/dashboards/customer/orders" },
    { title: "Receipts", href: "/dashboards/customer/receipts" },
    { title: "Account Settings", href: "/dashboards/customer/settings" },
    { title: "Change Password", href: "/dashboards/customer/settings/change-password" },
  ],
  supplier: [
    { title: "Dashboard", href: "/dashboards/supplier" },
    { title: "Primary Orders", href: "/dashboards/supplier/primary-orders" },
    { title: "Messages", href: "/dashboards/supplier/messages" },
    { title: "Account Settings", href: "/dashboards/supplier/settings" },
    { title: "Change Password", href: "/dashboards/supplier/settings/change-password" },
  ],
  brandManager: [
    { title: "Dashboard", href: "/dashboards/brandManager" },
    { title: "Primary Order Request", href: "/dashboards/brandManager/primary-order-request" },
    { title: "Primary Sale Orders", href: "/dashboards/brandManager/orders" },
    { title: "Return Stock", href: "/dashboards/brandManager/return-stock" },
    { title: "Messages", href: "/dashboards/brandManager/messages" },
    { title: "Account Settings", href: "/dashboards/brandManager/settings" },
    { title: "Change Password", href: "/dashboards/brandManager/settings/change-password" },
  ],
  accountOfficer: [{ title: "Dashboard", href: "/dashboards/accountOfficer" }],
  cashier: [{ title: "Dashboard", href: "/dashboards/cashier" }],
  ceo: [{ title: "Dashboard", href: "/dashboards/ceo" }],
  manageDirector: [{ title: "Dashboard", href: "/dashboards/manageDirector" }],
  hrAssistant: [{ title: "Dashboard", href: "/dashboards/hrAssistant" }],
  kpo: [{ title: "Dashboard", href: "/dashboards/kpo" }],
  nationalSM: [{ title: "Dashboard", href: "/dashboards/nationalSM" }],
  regionalSM: [{ title: "Dashboard", href: "/dashboards/regionalSM" }],
  zoneSM: [{ title: "Dashboard", href: "/dashboards/zoneSM" }],
  territorySM: [{ title: "Dashboard", href: "/dashboards/territorySM" }],
  fieldSM: [{ title: "Dashboard", href: "/dashboards/fieldSM" }],
  vendor: [{ title: "Dashboard", href: "/dashboards/vendor" }],
};

export function getAdminNavigation({ canAccessCompanyManagement = false } = {}) {
  return ADMIN_NAVIGATION_GROUPS
    .map((group) => ({
      ...group,
      children: Array.isArray(group.children) ? [...group.children] : undefined,
    }))
    .filter((group) => {
      if (group.requiresSystemAdmin && !canAccessCompanyManagement) return false;
      if (!Array.isArray(group.children)) return true;
      group.children = group.children.filter((child) => !child.requiresSystemAdmin || canAccessCompanyManagement);
      return group.children.length > 0;
    });
}

export function getSearchItemsForRole(roleKey, options = {}) {
  const resolved = resolveRoleDefinition(roleKey);
  if (resolved.scope === "system" || resolved.scope === "company" && resolved.dashboardPath.startsWith("/dashboards/admin")) {
    return flattenNavigation(getAdminNavigation({ canAccessCompanyManagement: options.canAccessCompanyManagement }));
  }
  return USER_ROLE_LINKS[options.slug || roleKey] || USER_ROLE_LINKS[resolved.key] || [];
}

export function flattenNavigation(items = []) {
  const flat = [];
  for (const item of items) {
    if (item.href) flat.push({ title: item.title, href: item.href, keywords: item.keywords || [] });
    if (Array.isArray(item.children)) flat.push(...flattenNavigation(item.children));
  }
  return flat;
}

function humanize(segment = "") {
  return String(segment || "")
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (s) => s.toUpperCase());
}

export function deriveRoleSlugFromLinks(links = [], roleKey = "") {
  const roleLink = (links || []).find((item) => item.href?.startsWith("/dashboards/") && item.href !== "/dashboards");
  if (roleLink) {
    const parts = roleLink.href.split("/").filter(Boolean);
    if (parts[0] === "dashboards" && parts[1] && parts[1] !== "admin") return parts[1];
  }

  const resolved = resolveRoleDefinition(roleKey);
  const parts = String(resolved.dashboardPath || "").split("/").filter(Boolean);
  return parts[1] && parts[1] !== "admin" ? parts[1] : "";
}

export function buildRoleNavigationGroups(links = [], roleKey = "") {
  const roleSlug = deriveRoleSlugFromLinks(links, roleKey);
  const grouped = [];

  (links || []).forEach((item) => {
    const tokens = String(item.href || "").split("/").filter(Boolean);
    const roleIndex = tokens.findIndex((token) => token === roleSlug);
    const next = roleIndex >= 0 ? tokens[roleIndex + 1] : null;
    const groupKey = !next ? "dashboard" : next;
    const existing = grouped.find((entry) => entry.key === groupKey);
    if (existing) {
      existing.items.push(item);
      return;
    }
    grouped.push({
      key: groupKey,
      title: groupKey === "dashboard" ? "Dashboard" : humanize(groupKey),
      iconName: groupKey,
      items: [item],
    });
  });

  return grouped;
}
