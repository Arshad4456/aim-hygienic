import { normalizeMobileRole } from '../config/mobileErpAccess';

const ROLE_TO_DASHBOARD = {
  admin: 'systemAdmin',
  'System Admin': 'systemAdmin',
  'Super Admin': 'systemAdmin',
  'Company Admin': 'companyAdmin',
  CEO: 'ceo',
  'Purchase Manager': 'purchaseManager',
  'Finance Manager': 'financeManager',
  'Finance / Accounts': 'financeManager',
  Accountant: 'accountOfficer',
  'Account Officer': 'accountOfficer',
  'Sales Manager': 'brandManager',
  'Dispatch / Logistics': 'deliveryBoy',
  'Warehouse Manager': 'warehouseManager',
  'Brand Manager': 'brandManager',
  Distributor: 'distributor',
  'Distributor Store Manager': 'distributor',
  'Distributor Accountant': 'distributor',
  'Order Booker': 'orderBooker',
  Salesman: 'salesman',
  'Driver / Delivery': 'deliveryBoy',
  'Delivery Boy': 'deliveryBoy',
  customer: 'customer',
  Customer: 'customer',
  Supplier: 'supplier',
  Vendor: 'vendor',
  'Store Manager': 'storeManager',
  Cashier: 'cashier',
  'Production Manager': 'productionManager',
  'Production Supervisor': 'productionSupervisor',
  'Quality Manager': 'qualityManager',
  'Service Manager': 'serviceManager',
  'Service Agent': 'serviceAgent',
  Technician: 'technician',
  'Trading Manager': 'tradingManager',
  'Import Officer': 'importOfficer',
  'Export Officer': 'exportOfficer',
};

export function roleToDashboardKey(role) {
  if (ROLE_TO_DASHBOARD[role]) return ROLE_TO_DASHBOARD[role];
  return normalizeMobileRole(role);
}

export function isKnownRole(role) {
  const mapped = roleToDashboardKey(role);
  return Boolean(mapped && mapped !== role) || Boolean(ROLE_TO_DASHBOARD[role]);
}
