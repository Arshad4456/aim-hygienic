const ROLE_TO_DASHBOARD = {
  admin: 'admin',
  'Company Admin': 'admin',
  'Purchase Manager': 'admin',
  'Finance / Accounts': 'admin',
  'Dispatch / Logistics': 'admin',
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
};


export function roleToDashboardKey(role) {
  return ROLE_TO_DASHBOARD[role] || 'admin';
}

export function isKnownRole(role) {
  return Boolean(ROLE_TO_DASHBOARD[role]);
}