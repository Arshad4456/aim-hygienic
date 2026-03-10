const PERMISSIONS_BY_ROLE = {
  superAdmin: ['*'],
  systemAdmin: ['*'],
  executive: ['dashboard.view', 'reports.view', 'reports.export', 'users.view'],
  salesManager: ['dashboard.view', 'orders.view', 'orders.create', 'orders.edit', 'reports.view'],
  salesOps: ['dashboard.view', 'orders.view', 'inventory.view', 'reports.view'],
  warehouseManager: ['dashboard.view', 'inventory.view', 'orders.view', 'orders.approve'],
  inventoryController: ['inventory.view', 'inventory.adjust'],
  financeOfficer: ['payments.view', 'payments.post', 'receipts.view', 'receipts.approve'],
  cashier: ['payments.view', 'payments.post', 'receipts.view'],
  hrOfficer: ['users.view', 'users.manage'],
  logisticsCoordinator: ['vehicles.view', 'vehicles.assign', 'liveTracking.view'],
  distributor: ['orders.view', 'orders.create', 'payments.view', 'receipts.view'],
  orderBooker: ['orders.view', 'orders.create'],
  salesman: ['orders.view', 'orders.create'],
  deliveryExecutive: ['orders.view', 'liveTracking.view'],
  customerSupport: ['orders.view', 'users.view'],
  auditor: ['reports.view', 'audit.view'],
};

const LEGACY_ROLE_MAP = {
  admin: 'systemAdmin',
  ceo: 'executive',
  'managing director': 'executive',
  'national sale manager': 'salesManager',
  'regional sale manager': 'salesManager',
  'zone sale manager': 'salesManager',
  'territory sale manager': 'salesManager',
  'field sale manager': 'salesManager',
  'warehouse manager': 'warehouseManager',
  'account officer': 'financeOfficer',
  cashier: 'cashier',
  'hr assistant': 'hrOfficer',
  distributor: 'distributor',
  'order booker': 'orderBooker',
  salesman: 'salesman',
  'delivery boy': 'deliveryExecutive',
  'brand manager': 'salesOps',
  kpo: 'salesOps',
};

export function normalizeRoleCode(role) {
  const normalized = String(role || '').trim().toLowerCase();
  return LEGACY_ROLE_MAP[normalized] || normalized;
}

export function canViewModule({ role, permission }) {
  if (!permission) return false;
  const normalizedRole = normalizeRoleCode(role);
  const permissions = PERMISSIONS_BY_ROLE[normalizedRole] || [];
  return permissions.includes('*') || permissions.includes(permission);
}
