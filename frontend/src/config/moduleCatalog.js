const moduleRows = [
  { key: "dashboard", name: "Dashboard", category: "Home", icon: "▣", path: "/portals", description: "Role-aware business overview and quick actions." },

  { key: "system-admin", name: "System Admin", category: "SaaS Control", icon: "◎", path: "/portals/system-admin", description: "SaaS owner control center for clients, subscriptions, modules, and support." },
  { key: "system-admin-companies", name: "Client Companies", category: "SaaS Control", icon: "◫", path: "/portals/system-admin/companies", description: "Activate, suspend, and control client company limits." },
  { key: "system-admin-users", name: "System Users", category: "SaaS Control", icon: "◉", path: "/portals/system-admin/users", description: "Create system admins and company admins from the owner portal." },
  { key: "subscription-plans", name: "Subscription Plans", category: "SaaS Control", icon: "◈", path: "/portals/system-admin/subscriptions", description: "Create SaaS plans, module limits, and user limits." },
  { key: "module-controls", name: "Module Controls", category: "SaaS Control", icon: "▤", path: "/portals/system-admin/modules", description: "Control module access and package availability." },

  { key: "companies", name: "Companies", category: "Setup", icon: "🏢", path: "/portals/companies", description: "Company, branch, tenant records, and company activation." },
  { key: "erp-templates", name: "ERP Templates", category: "Setup", icon: "▧", path: "/portals/erp-templates", description: "ERP templates, business types, and enabled modules." },
  { key: "roles", name: "Roles & Permissions", category: "Setup", icon: "🔐", path: "/portals/roles", description: "Database-driven roles and permissions." },
  { key: "users", name: "Users", category: "Setup", icon: "👥", path: "/portals/users", description: "Company users, portal access, and mobile access." },
  { key: "settings", name: "Settings", category: "Setup", icon: "⚙", path: "/portals/settings", description: "Company, user, portal, password, and notification settings." },

  { key: "products", name: "Products", category: "Master Data", icon: "▦", path: "/portals/products", description: "Product catalog, SKU, pricing, categories, units, and barcode setup." },
  { key: "suppliers", name: "Suppliers", category: "Master Data", icon: "◇", path: "/portals/master-data/suppliers", description: "Supplier profiles, payment terms, opening balances, and procurement contacts." },
  { key: "customers", name: "Customers", category: "Master Data", icon: "☻", path: "/portals/customers", description: "Customer and retailer management." },
  { key: "warehouses", name: "Warehouses", category: "Master Data", icon: "▨", path: "/portals/master-data/warehouses", description: "Warehouse records, address, manager, status, and company stock locations." },
  { key: "territory", name: "Territory", category: "Master Data", icon: "⌖", path: "/portals/territory", description: "Regions, zones, areas, fields, routes, and beat plans." },
  { key: "regions", name: "Regions", category: "Master Data", icon: "◎", path: "/portals/master-data/regions", description: "Top-level sales, warehouse, and distribution coverage regions." },
  { key: "zones", name: "Zones", category: "Master Data", icon: "◌", path: "/portals/master-data/zones", description: "Region-wise operational zones for distribution coverage." },
  { key: "areas", name: "Territories / Areas", category: "Master Data", icon: "⌾", path: "/portals/master-data/areas", description: "Territories and areas used for retailer coverage and field assignment." },
  { key: "fields", name: "Fields / Beats", category: "Master Data", icon: "⌁", path: "/portals/master-data/fields", description: "Field beats and route points for salesmen, order bookers, and deliveries." },

  { key: "primary-sales-orders", name: "Primary Sales", category: "Sales", icon: "↗", path: "/portals/sales/primary-orders", description: "Company sales to distributors." },
  { key: "secondary-sales-orders", name: "Secondary Sales", category: "Sales", icon: "↘", path: "/portals/sales/secondary-orders", description: "Distributor sales to customers or retailers." },
  { key: "customer-orders", name: "Customer Orders", category: "Sales", icon: "□", path: "/portals/customers/orders", description: "Customer order requests and history." },
  { key: "customer-billing", name: "Customer Billing", category: "Sales", icon: "▣", path: "/portals/customer/billing", description: "Customer invoices, receipts, outstanding balance, and payments." },
  { key: "returns", name: "Returns", category: "Sales", icon: "↺", path: "/portals/returns", description: "Return stock, damage, expiry, and approval workflow." },

  { key: "procurement", name: "Procurement", category: "Purchase", icon: "⇣", path: "/portals/procurement", description: "Supplier to company purchase flow." },
  { key: "purchase-orders", name: "Purchase Orders", category: "Purchase", icon: "✎", path: "/portals/procurement/purchase-orders", description: "Supplier order workflow." },
  { key: "supplier-payments", name: "Supplier Payments", category: "Purchase", icon: "₨", path: "/portals/procurement/payments", description: "Company payments to suppliers." },

  { key: "inventory", name: "Inventory", category: "Inventory", icon: "▥", path: "/portals/inventory", description: "Stock availability, ledgers, valuation, and movement." },
  { key: "warehouse", name: "Warehouse", category: "Inventory", icon: "▨", path: "/portals/warehouse", description: "Goods receipts, dispatch preparation, transfers, and warehouse stock." },
  { key: "goods-receipts", name: "Goods Receipts", category: "Inventory", icon: "⇥", path: "/portals/warehouse/goods-receipts", description: "Receiving stock into warehouse." },

  { key: "finance", name: "Finance", category: "Finance", icon: "₨", path: "/portals/finance", description: "Accounts, invoices, ledgers, balances, aging, and reports." },
  { key: "receipts", name: "Receipts", category: "Finance", icon: "▤", path: "/portals/finance/receipts", description: "Distributor and customer collections." },
  { key: "payments", name: "Payments", category: "Finance", icon: "▥", path: "/portals/finance/payments", description: "Supplier, distributor, expense, and loan payment workflows." },
  { key: "expenses", name: "Expenses", category: "Finance", icon: "−", path: "/portals/expenses", description: "Company and distributor expenses." },
  { key: "loans", name: "Loans", category: "Finance", icon: "∑", path: "/portals/loans", description: "Loan details and repayment tracking." },

  { key: "operations", name: "Operations Center", category: "Logistics", icon: "✦", path: "/portals/operations", description: "Control center for delivery, fleet, finance, and live tracking." },
  { key: "fleet", name: "Fleet", category: "Logistics", icon: "▰", path: "/portals/fleet", description: "Vehicles, trips, fuel, maintenance, and assignments." },
  { key: "dispatches", name: "Dispatches", category: "Logistics", icon: "⇢", path: "/portals/logistics/dispatches", description: "Warehouse dispatch to delivery users." },
  { key: "deliveries", name: "Deliveries", category: "Logistics", icon: "✓", path: "/portals/deliveries", description: "Delivery plan, proof of delivery, and exceptions." },
  { key: "live-tracking", name: "Live Tracking", category: "Logistics", icon: "⌁", path: "/portals/live-tracking", description: "Live location, duty sessions, route playback, and tracking reports." },

  { key: "notifications", name: "Notifications", category: "Communication", icon: "◍", path: "/portals/notifications", description: "In-app, mobile push, SMS, WhatsApp, email, and notification logs." },
  { key: "messages", name: "Messages", category: "Communication", icon: "✉", path: "/portals/messages", description: "Legacy messages mapped to Notification Center." },
  { key: "reports", name: "Reports", category: "Reports", icon: "▧", path: "/portals/reports", description: "Sales, inventory, finance, territory, fleet, and user activity reports." },

  { key: "retail-pos", name: "Retail POS", category: "Future Modules", icon: "⌁", path: "/portals/retail-pos", description: "POS billing, cashier shifts, receipt printing, discounts, and returns.", isPlanned: true, menu: false },
  { key: "manufacturing", name: "Manufacturing", category: "Future Modules", icon: "⚒", path: "/portals/manufacturing", description: "BOM, production planning, work orders, quality, and costing.", isPlanned: true, menu: false },
  { key: "service", name: "Service ERP", category: "Future Modules", icon: "☑", path: "/portals/service", description: "Tickets, service orders, SLA, AMC, spare parts, and service invoices.", isPlanned: true, menu: false },
  { key: "trading", name: "Trading/Import", category: "Future Modules", icon: "⇄", path: "/portals/trading", description: "Import/export, LC, shipment, landed cost, multi-currency, and margins.", isPlanned: true, menu: false },
];

export const MENU_CATEGORY_ORDER = ["Home", "SaaS Control", "Setup", "Master Data", "Sales", "Purchase", "Inventory", "Finance", "Logistics", "Communication", "Reports", "Future Modules"];

export const RAWYAN_MODULE_CATALOG = moduleRows.map((item, index) => ({
  ...item,
  canonicalPath: item.canonicalPath || item.path,
  order: index + 1,
  menu: item.menu !== false,
}));

export const MODULE_BY_KEY = Object.fromEntries(RAWYAN_MODULE_CATALOG.map((item) => [item.key, item]));
export const MODULES_BY_CATEGORY = RAWYAN_MODULE_CATALOG.reduce((acc, item) => {
  const category = item.category || "Other";
  acc[category] = acc[category] || [];
  acc[category].push(item);
  return acc;
}, {});

export function sortModules(modules = []) {
  return [...modules].sort((a, b) => (a.order || 999) - (b.order || 999));
}

export function groupModulesByCategory(modules = []) {
  const grouped = modules.reduce((acc, item) => {
    const category = item.category || "Other";
    acc[category] = acc[category] || [];
    acc[category].push(item);
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([a], [b]) => {
      const ai = MENU_CATEGORY_ORDER.indexOf(a);
      const bi = MENU_CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a.localeCompare(b);
    })
    .map(([category, items]) => ({ category, items: sortModules(items) }));
}

export function findModuleByPath(pathname = "") {
  const clean = (pathname || "/portals").replace(/\/$/, "") || "/portals";
  return RAWYAN_MODULE_CATALOG.find((m) => clean === m.path || clean.startsWith(`${m.path}/`)) || MODULE_BY_KEY.dashboard;
}
