const ROLE_TO_DASHBOARD = {
  admin: 'admin',
  CEO: 'ceo',
  'Managing Director': 'manageDirector',
  'Warehouse Manager': 'warehouseManager',
  'Account Officer': 'accountOfficer',
  'HR Assistant': 'hrAssistant',
  Cashier: 'cashier',
  KPO: 'kpo',
  'Brand Manager': 'brandManager',
  'National Sale Manager': 'nationalSM',
  'Regional Sale Manager': 'regionalSM',
  'Zone Sale Manager': 'zoneSM',
  'Territory Sale Manager': 'territorySM',
  Distributor: 'distributor',
  'Field Sale Manager': 'fieldSM',
  'Order Booker': 'orderBooker',
  Salesman: 'salesman',
  'Delivery Boy': 'deliveryBoy',
  customer: 'customer',
};

export function roleToDashboardKey(role) {
  return ROLE_TO_DASHBOARD[role] || 'admin';
}

export function isKnownRole(role) {
  return Boolean(ROLE_TO_DASHBOARD[role]);
}
