export const MOBILE_ERP_TYPES = {
  distribution_erp: {
    label: 'Distribution ERP',
    modules: ['dashboard', 'customers', 'orders', 'collections', 'delivery', 'warehouse', 'inventory', 'live-tracking', 'messages', 'reports', 'profile'],
  },
  retail_pos_erp: {
    label: 'Retail POS ERP',
    modules: ['dashboard', 'retail-pos', 'customers', 'inventory', 'warehouse', 'receipts', 'returns', 'reports', 'profile'],
  },
  manufacturing_erp: {
    label: 'Manufacturing ERP',
    modules: ['dashboard', 'manufacturing', 'inventory', 'warehouse', 'quality', 'reports', 'profile'],
  },
  service_erp: {
    label: 'Service ERP',
    modules: ['dashboard', 'service', 'customers', 'inventory', 'receipts', 'reports', 'profile'],
  },
  trading_erp: {
    label: 'Trading ERP',
    modules: ['dashboard', 'trading', 'procurement', 'inventory', 'warehouse', 'finance', 'reports', 'profile'],
  },
  custom_erp: {
    label: 'Custom ERP',
    modules: ['dashboard', 'customers', 'orders', 'inventory', 'warehouse', 'retail-pos', 'manufacturing', 'service', 'trading', 'reports', 'profile'],
  },
};

export const MOBILE_ROLE_ALIASES = {
  'system admin': 'systemAdmin',
  'super admin': 'systemAdmin',
  'company admin': 'companyAdmin',
  'purchase manager': 'purchaseManager',
  'finance manager': 'financeManager',
  'finance / accounts': 'financeManager',
  accountant: 'accountOfficer',
  'account officer': 'accountOfficer',
  ceo: 'ceo',
  'sales manager': 'brandManager',
  'warehouse manager': 'warehouseManager',
  'dispatch / logistics': 'deliveryBoy',
  'brand manager': 'brandManager',
  distributor: 'distributor',
  'distributor store manager': 'distributor',
  'distributor accountant': 'distributor',
  salesman: 'salesman',
  'order booker': 'orderBooker',
  'driver / delivery': 'deliveryBoy',
  'delivery boy': 'deliveryBoy',
  customer: 'customer',
  supplier: 'supplier',
  vendor: 'vendor',
  'store manager': 'storeManager',
  cashier: 'cashier',
  'production manager': 'productionManager',
  'production supervisor': 'productionSupervisor',
  'quality manager': 'qualityManager',
  'service manager': 'serviceManager',
  'service agent': 'serviceAgent',
  technician: 'technician',
  'trading manager': 'tradingManager',
  'import officer': 'importOfficer',
  'export officer': 'exportOfficer',
};

export const MOBILE_ROLE_MODULES = {
  systemAdmin: ['dashboard', 'system-admin-companies', 'system-admin-users', 'system-admin-modules', 'settings', 'profile'],
  companyAdmin: ['dashboard', 'users', 'products', 'customers', 'suppliers', 'warehouses', 'inventory', 'warehouse', 'finance', 'retail-pos', 'manufacturing', 'service', 'trading', 'reports', 'settings', 'profile'],
  purchaseManager: ['dashboard', 'procurement', 'suppliers', 'inventory', 'warehouse', 'reports', 'profile'],
  financeManager: ['dashboard', 'finance', 'receipts', 'payments', 'reports', 'profile'],
  storeManager: ['dashboard', 'retail-pos', 'customers', 'inventory', 'warehouse', 'receipts', 'returns', 'reports', 'profile'],
  cashier: ['dashboard', 'retail-pos', 'customers', 'receipts', 'returns', 'profile'],
  productionManager: ['dashboard', 'manufacturing', 'inventory', 'warehouse', 'quality', 'reports', 'profile'],
  productionSupervisor: ['dashboard', 'manufacturing', 'inventory', 'warehouse', 'quality', 'profile'],
  qualityManager: ['dashboard', 'manufacturing', 'quality', 'reports', 'profile'],
  serviceManager: ['dashboard', 'service', 'customers', 'inventory', 'receipts', 'reports', 'profile'],
  serviceAgent: ['dashboard', 'service', 'customers', 'receipts', 'profile'],
  technician: ['dashboard', 'service', 'inventory', 'profile'],
  tradingManager: ['dashboard', 'trading', 'procurement', 'inventory', 'warehouse', 'finance', 'reports', 'profile'],
  importOfficer: ['dashboard', 'trading', 'procurement', 'inventory', 'warehouse', 'finance', 'profile'],
  exportOfficer: ['dashboard', 'trading', 'customers', 'inventory', 'finance', 'profile'],
};

export const MOBILE_MODULE_DETAILS = {
  dashboard: { title: 'Dashboard', group: 'Home', screen: 'industry:dashboard' },
  profile: { title: 'Profile', group: 'Account', screen: 'Settings' },
  settings: { title: 'Settings', group: 'Account', screen: 'Settings' },
  users: { title: 'Users', group: 'Setup', screen: 'companyAdmin:users' },
  products: { title: 'Products', group: 'Master Data', screen: 'companyAdmin:products' },
  customers: { title: 'Customers', group: 'Master Data', screen: 'companyAdmin:customers' },
  suppliers: { title: 'Suppliers', group: 'Master Data', screen: 'companyAdmin:suppliers' },
  warehouses: { title: 'Warehouses', group: 'Inventory', screen: 'companyAdmin:warehouses' },
  inventory: { title: 'Inventory', group: 'Inventory', screen: 'companyAdmin:inventory' },
  warehouse: { title: 'Warehouse', group: 'Inventory', screen: 'companyAdmin:warehouse' },
  finance: { title: 'Finance', group: 'Finance', screen: 'companyAdmin:finance' },
  receipts: { title: 'Receipts', group: 'Finance', screen: 'companyAdmin:receipts' },
  payments: { title: 'Payments', group: 'Finance', screen: 'companyAdmin:payments' },
  reports: { title: 'Reports', group: 'Reports', screen: 'companyAdmin:reports' },
  procurement: { title: 'Procurement', group: 'Purchase', screen: 'companyAdmin:procurement' },
  returns: { title: 'Returns', group: 'Sales', screen: 'companyAdmin:returns' },
  delivery: { title: 'Deliveries', group: 'Delivery', screen: 'companyAdmin:delivery' },
  'live-tracking': { title: 'Live Tracking', group: 'Delivery', screen: 'companyAdmin:live-tracking' },
  messages: { title: 'Messages', group: 'Communication', screen: 'companyAdmin:messages' },
  orders: { title: 'Orders', group: 'Sales', screen: 'companyAdmin:orders' },
  collections: { title: 'Collections', group: 'Sales', screen: 'companyAdmin:collections' },
  quality: { title: 'Quality', group: 'Manufacturing', screen: 'manufacturing:quality' },
  'retail-pos': { title: 'Retail POS', group: 'Retail POS', screen: 'retailPos:workspace' },
  manufacturing: { title: 'Manufacturing', group: 'Manufacturing', screen: 'manufacturing:workspace' },
  service: { title: 'Service Desk', group: 'Service', screen: 'service:workspace' },
  trading: { title: 'Trading / Import', group: 'Trading', screen: 'trading:workspace' },
  'system-admin-companies': { title: 'Client Companies', group: 'SaaS Control', screen: 'systemAdmin:companies' },
  'system-admin-users': { title: 'SaaS Users', group: 'SaaS Control', screen: 'systemAdmin:users' },
  'system-admin-modules': { title: 'Module Controls', group: 'SaaS Control', screen: 'systemAdmin:modules' },
};

export function normalizeMobileRole(value = '') {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  return MOBILE_ROLE_ALIASES[normalized] || value || 'companyAdmin';
}

export function getUserErpType(user = {}) {
  return String(user?.erpTemplateKey || user?.company?.erpTemplateKey || user?.businessType || user?.company?.businessType || 'distribution_erp').trim() || 'distribution_erp';
}

export function getCompanyModuleKeys(user = {}) {
  const company = user?.company || {};
  const explicit = user?.enabledModules || user?.allowedModules || company.enabledModules || company.allowedModules || [];
  if (Array.isArray(explicit) && explicit.length) return explicit;
  const erpType = getUserErpType(user);
  return MOBILE_ERP_TYPES[erpType]?.modules || MOBILE_ERP_TYPES.distribution_erp.modules;
}

export function buildMobileMenuForUser(roleKey, user = {}) {
  const normalizedRole = normalizeMobileRole(roleKey || user?.role || user?.roleName || user?.portalType);
  const roleModules = MOBILE_ROLE_MODULES[normalizedRole] || null;
  if (!roleModules) return null;

  if (normalizedRole === 'systemAdmin') {
    return roleModules.map((moduleKey) => makeMobileMenuItem(normalizedRole, moduleKey)).filter(Boolean);
  }

  const companyAllowed = new Set([...getCompanyModuleKeys(user), 'dashboard', 'profile', 'settings']);
  return roleModules
    .filter((moduleKey) => companyAllowed.has(moduleKey))
    .map((moduleKey) => makeMobileMenuItem(normalizedRole, moduleKey))
    .filter(Boolean);
}

export function makeMobileMenuItem(roleKey, moduleKey) {
  const detail = MOBILE_MODULE_DETAILS[moduleKey];
  if (!detail) return null;
  const screenKey = roleKey === 'systemAdmin' && moduleKey === 'dashboard' ? 'systemAdmin:companies' : detail.screen;
  return {
    key: screenKey,
    title: detail.title,
    modulePath: moduleKey === 'dashboard' ? '' : moduleKey,
    group: detail.group,
    screenKey: detail.screen,
  };
}
