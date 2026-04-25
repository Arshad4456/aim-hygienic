import { resolveRoleDefinition } from "./roleRegistry";

export const ADMIN_NAVIGATION_GROUPS = [
  {
    type: "group",
    key: "dashboard",
    title: "Dashboard",
    icon: "dashboard",
    children: [
      { title: "Dashboard Overview", href: "/portals/admin" },
      { title: "Operations Command Center", href: "/portals/admin/operations" },
      { title: "Sales KPI", href: "/portals/admin/sales-kpi" },
    ],
  },
  {
    type: "group",
    key: "company",
    title: "Company Management",
    icon: "account",
    requiresSystemAdmin: true,
    children: [
      { title: "Add New Company", href: "/portals/admin/companies/add" },
      { title: "Company List", href: "/portals/admin/companies" },
    ],
  },
  {
    type: "group",
    key: "hr",
    title: "HR & Role Management",
    icon: "hr",
    children: [
      { title: "Module Overview", href: "/portals/admin/hr" },
      { title: "Add User", href: "/portals/admin/users/add" },
      { title: "User List", href: "/portals/admin/users" },
      { title: "Module Access Control", href: "/portals/admin/module-access", requiresSystemAdmin: true },
    ],
  },
  {
    type: "group",
    key: "products",
    title: "Products Management",
    icon: "products",
    children: [
      { title: "Add New Product", href: "/portals/admin/products/add" },
      { title: "View Product List", href: "/portals/admin/products" },
      { title: "Product Barcode List", href: "/portals/admin/products/barcodes" },
      { title: "Price Change", href: "/portals/admin/products/price-change" },
    ],
  },
  {
    type: "group",
    key: "inventory",
    title: "Warehouse & Inventory",
    icon: "inventory",
    children: [
      { title: "Module Overview", href: "/portals/admin/warehouse-inventory" },
      { title: "Warehouse Master", href: "/portals/admin/inventory/warehouses" },
      { title: "Inventory Ledger", href: "/portals/admin/inventory/ledger" },
      { title: "Stock Transfers", href: "/portals/admin/inventory/transfers" },
      { title: "Stock Summary", href: "/portals/admin/inventory/summary" },
      { title: "Low Stock Alerts", href: "/portals/admin/inventory/low-stock" },
      { title: "Near Expiry Products", href: "/portals/admin/inventory/near-expiry" },
    ],
  },
  {
    type: "group",
    key: "territory",
    title: "Territory & Assets",
    icon: "territory",
    children: [
      { title: "Add Warehouse", href: "/portals/admin/warehouses/add" },
      { title: "Warehouse List", href: "/portals/admin/warehouses" },
      { title: "Add Region", href: "/portals/admin/regions/add" },
      { title: "Region List", href: "/portals/admin/regions" },
      { title: "Add Zone", href: "/portals/admin/zones/add" },
      { title: "Zone List", href: "/portals/admin/zones" },
      { title: "Add Territory", href: "/portals/admin/areas/add" },
      { title: "Territory List", href: "/portals/admin/areas" },
      { title: "Add Field", href: "/portals/admin/fields/add" },
      { title: "Field List", href: "/portals/admin/fields" },
      { title: "Add Vehicle", href: "/portals/admin/assets/vehicles/add" },
      { title: "Vehicle List", href: "/portals/admin/assets/vehicles" },
    ],
  },
  {
    type: "group",
    key: "orders",
    title: "Order Management",
    icon: "orders",
    children: [
      { title: "Module Overview", href: "/portals/admin/order-management" },
      { title: "Sales Orders", href: "/portals/admin/order-management/sales-orders" },
      { title: "Order Approvals", href: "/portals/admin/order-management/approvals" },
      { title: "Pick & Dispatch", href: "/portals/admin/order-management/dispatch" },
      { title: "Returns & Claims", href: "/portals/admin/order-management/returns" },
    ],
  },
  {
    type: "group",
    key: "vehicleManagement",
    title: "Vehicle Management",
    icon: "vehicle",
    children: [
      { title: "Module Overview", href: "/portals/admin/vehicle-management" },
      { title: "Add Vehicle", href: "/portals/admin/vehicle-management/add" },
      { title: "Vehicle List", href: "/portals/admin/vehicle-management/vehicles" },
      { title: "Fuel Management", href: "/portals/admin/vehicle-management/fuel-management" },
      { title: "Vehicle Maintenance", href: "/portals/admin/vehicle-management/maintenance" },
    ],
  },
  {
    type: "group",
    key: "accountManagement",
    title: "Account Management",
    icon: "account",
    children: [
      { title: "Account Detail", href: "/portals/admin/account/manage" },
      { title: "Loan Detail", href: "/portals/admin/account/loan-detail" },
      { title: "Payment Management", href: "/portals/admin/finance/payments" },
    ],
  },
  {
    type: "group",
    key: "finance",
    title: "Finance & Accounts",
    icon: "finance",
    children: [
      { title: "Module Overview", href: "/portals/admin/finance" },
      { title: "Invoices", href: "/portals/admin/finance/invoices" },
      { title: "Receipts", href: "/portals/admin/finance/receipts" },
      { title: "Aging Report", href: "/portals/admin/finance/aging" },
    ],
  },
  {
    type: "group",
    key: "expense",
    title: "Expense Management",
    icon: "expense",
    children: [
      { title: "Module Overview", href: "/portals/admin/expense" },
      { title: "AIM – Personal Expense", href: "/portals/admin/expense/personal" },
      { title: "Daily Expense", href: "/portals/admin/expense/daily" },
      { title: "Distributor Expense", href: "/portals/admin/expense/distributor" },
    ],
  },
  {
    type: "group",
    key: "procurement",
    title: "Procurement",
    icon: "purchase",
    children: [
      { title: "Module Overview", href: "/portals/admin/procurement" },
      { title: "Supplier Master", href: "/portals/admin/procurement/suppliers" },
      { title: "Purchase Orders", href: "/portals/admin/procurement/purchase-orders" },
      { title: "Goods Receipt (GRN)", href: "/portals/admin/procurement/grn" },
      { title: "Supplier Payments", href: "/portals/admin/procurement/payments" },
    ],
  },
  {
    type: "group",
    key: "logistics",
    title: "Distribution & Logistics",
    icon: "logistics",
    children: [
      { title: "Module Overview", href: "/portals/admin/logistics" },
      { title: "Route Planning", href: "/portals/admin/logistics/routes" },
      { title: "Dispatch & Delivery", href: "/portals/admin/logistics/dispatch" },
      { title: "Vehicle Assignment", href: "/portals/admin/assets/vehicles" },
    ],
  },
  {
    type: "group",
    key: "qc",
    title: "Quality & Compliance",
    icon: "qc",
    children: [
      { title: "Module Overview", href: "/portals/admin/quality" },
      { title: "Raw Material QC", href: "/portals/admin/quality/raw-material" },
      { title: "Production QC", href: "/portals/admin/quality/production" },
      { title: "Finished Goods QC", href: "/portals/admin/quality/finished-goods" },
      { title: "Final Release QC", href: "/portals/admin/quality/final-release" },
    ],
  },
  { type: "link", title: "Messages", href: "/portals/admin/messages", icon: "messages" },
  { type: "link", title: "User Live Tracking", href: "/portals/admin/live-tracking", icon: "tracking" },
  { type: "link", title: "Reports", href: "/portals/admin/reports", icon: "reports" },
  { type: "link", title: "Settings", href: "/portals/admin/settings", icon: "settings" },
];

export const USER_ROLE_LINKS = {
  warehouseManager: [
    { title: "Dashboard", href: "/portals/warehouseManager" },
    { title: "Company Stock Summary", href: "/portals/warehouseManager/stock-summary" },
    { title: "Inward / Outward", href: "/portals/warehouseManager/inward-outward" },
    { title: "Goods Receipt Verification", href: "/portals/warehouseManager/goods-receipts" },
    { title: "Company Dispatch Preparation", href: "/portals/warehouseManager/dispatch-preparation" },
    { title: "Stock Adjustment", href: "/portals/warehouseManager/stock-adjustment" },
    { title: "Damage & Expiry", href: "/portals/warehouseManager/damage-expiry" },
    { title: "Warehouse & Inventory", href: "/portals/warehouseManager/warehouse-inventory" },
    { title: "Order Management", href: "/portals/warehouseManager/order-management" },
  ],
  distributor: [
    { title: "Dashboard", href: "/portals/distributor" },
    { title: "Inventory Dashboard", href: "/portals/distributor/inventory" },
    { title: "Stock Received", href: "/portals/distributor/stock-received" },
    { title: "Stock Availability", href: "/portals/distributor/stock-availability" },
    { title: "Stock Movements", href: "/portals/distributor/stock-movements" },
    { title: "Stock Adjustment", href: "/portals/distributor/stock-adjustment" },
    { title: "Damage & Expiry", href: "/portals/distributor/damage-expiry" },
    { title: "Secondary Orders", href: "/portals/distributor/orders" },
    { title: "Customer Receipts", href: "/portals/distributor/receipts" },
    { title: "Payable to Company", href: "/portals/distributor/payments" },
    { title: "Distributor Expense", href: "/portals/distributor/expense" },
    { title: "Primary Order Request", href: "/portals/distributor/primary-order-request" },
    { title: "Return Stock", href: "/portals/distributor/return-stock" },
    { title: "HR & Role Management", href: "/portals/distributor/hr" },
    { title: "User List", href: "/portals/distributor/users" },
    { title: "Reports", href: "/portals/distributor/reports" },
    { title: "Messages", href: "/portals/distributor/messages" },
    { title: "Live Tracking", href: "/portals/distributor/live-tracking" },
    { title: "Account Settings", href: "/portals/distributor/settings" },
    { title: "Change Password", href: "/portals/distributor/settings/change-password" },
  ],
  distributorStoreManager: [
    { title: "Inventory Dashboard", href: "/portals/distributor/inventory" },
    { title: "Stock Received", href: "/portals/distributor/stock-received" },
    { title: "Stock Availability", href: "/portals/distributor/stock-availability" },
    { title: "Stock Movements", href: "/portals/distributor/stock-movements" },
    { title: "Stock Adjustment", href: "/portals/distributor/stock-adjustment" },
    { title: "Damage & Expiry", href: "/portals/distributor/damage-expiry" },
    { title: "Return Stock", href: "/portals/distributor/return-stock" },
    { title: "Reports", href: "/portals/distributor/reports" },
  ],
  distributorAccountant: [
    { title: "Accounts Dashboard", href: "/portals/distributor/accounts" },
    { title: "Customer Invoices", href: "/portals/distributor/customer-invoices" },
    { title: "Customer Receipts", href: "/portals/distributor/receipts" },
    { title: "Aging & Outstanding", href: "/portals/distributor/aging" },
    { title: "Payable to Company", href: "/portals/distributor/payments" },
    { title: "Distributor Expense", href: "/portals/distributor/expense" },
    { title: "Reports", href: "/portals/distributor/reports" },
  ],
  orderBooker: [
    { title: "Dashboard", href: "/portals/orderBooker" },
    { title: "Day Plan", href: "/portals/orderBooker/day-plan" },
    { title: "Assigned Customers", href: "/portals/orderBooker/customers" },
    { title: "Order Status", href: "/portals/orderBooker/order-status" },
    { title: "Collections", href: "/portals/orderBooker/collections" },
    { title: "Visit Status", href: "/portals/orderBooker/visits" },
    { title: "Create Orders", href: "/portals/orderBooker/orders" },
    { title: "Receipts", href: "/portals/orderBooker/receipts" },
  ],
  salesman: [
    { title: "Dashboard", href: "/portals/salesman" },
    { title: "Day Plan", href: "/portals/salesman/day-plan" },
    { title: "Assigned Customers", href: "/portals/salesman/customers" },
    { title: "Assigned Deliveries", href: "/portals/salesman/deliveries" },
    { title: "Collections", href: "/portals/salesman/collections" },
    { title: "Visit Status", href: "/portals/salesman/visits" },
    { title: "Delivery Desk", href: "/portals/salesman/orders" },
  ],
  deliveryBoy: [
    { title: "Dashboard", href: "/portals/deliveryBoy" },
    { title: "Day Plan", href: "/portals/deliveryBoy/day-plan" },
    { title: "Assigned Dispatches", href: "/portals/deliveryBoy/dispatches" },
    { title: "Live Tracking", href: "/portals/deliveryBoy/tracking" },
    { title: "Exceptions", href: "/portals/deliveryBoy/exceptions" },
    { title: "POD Desk", href: "/portals/deliveryBoy/orders" },
  ],
  customer: [
    { title: "Dashboard", href: "/portals/customer" },
    { title: "Invoice Visibility", href: "/portals/customer/invoices" },
    { title: "Outstanding Snapshot", href: "/portals/customer/outstanding" },
    { title: "Payment History", href: "/portals/customer/payment-history" },
    { title: "Return Requests", href: "/portals/customer/returns" },
    { title: "Order Requests", href: "/portals/customer/orders" },
    { title: "Receipts", href: "/portals/customer/receipts" },
    { title: "Account Settings", href: "/portals/customer/settings" },
    { title: "Change Password", href: "/portals/customer/settings/change-password" },
  ],
  supplier: [
    { title: "Dashboard", href: "/portals/supplier" },
    { title: "Primary Orders", href: "/portals/supplier/primary-orders" },
    { title: "Messages", href: "/portals/supplier/messages" },
    { title: "Account Settings", href: "/portals/supplier/settings" },
    { title: "Change Password", href: "/portals/supplier/settings/change-password" },
  ],
  brandManager: [
    { title: "Dashboard", href: "/portals/brandManager" },
    { title: "Primary Order Request", href: "/portals/brandManager/primary-order-request" },
    { title: "Return Stock", href: "/portals/brandManager/return-stock" },
    { title: "Messages", href: "/portals/brandManager/messages" },
    { title: "Account Settings", href: "/portals/brandManager/settings" },
    { title: "Change Password", href: "/portals/brandManager/settings/change-password" },
  ],
};

export function sanitizeRoleLinks(links = []) {
  const seen = new Set();
  return (links || [])
    .map((item) => ({
      ...item,
      title: String(item?.title || "").replace(/\s*\(Legacy\)$/i, ""),
    }))
    .filter((item) => {
      const href = String(item?.href || "");
      if (!href || seen.has(href)) return false;
      if (/\/settings\/change-password$/i.test(href)) return false;
      seen.add(href);
      return true;
    });
}

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
  if (resolved.scope === "system" || resolved.scope === "company" && resolved.dashboardPath.startsWith("/portals/admin")) {
    return flattenNavigation(getAdminNavigation({ canAccessCompanyManagement: options.canAccessCompanyManagement }));
  }
  return sanitizeRoleLinks(USER_ROLE_LINKS[options.slug || roleKey] || USER_ROLE_LINKS[resolved.key] || []);
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
  const roleLink = (links || []).find((item) => item.href?.startsWith("/portals/") && item.href !== "/portals");
  if (roleLink) {
    const parts = roleLink.href.split("/").filter(Boolean);
    if (parts[0] === "portals" && parts[1] && parts[1] !== "admin") return parts[1];
  }

  const resolved = resolveRoleDefinition(roleKey);
  const parts = String(resolved.dashboardPath || "").split("/").filter(Boolean);
  return parts[1] && parts[1] !== "admin" ? parts[1] : "";
}

export function buildRoleNavigationGroups(links = [], roleKey = "") {
  const roleSlug = deriveRoleSlugFromLinks(links, roleKey);
  const grouped = [];

  sanitizeRoleLinks(links).forEach((item) => {
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
