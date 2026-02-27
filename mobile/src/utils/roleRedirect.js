const ROLE_KEY_MAP = {
  admin: 'admin',
  CEO: 'ceo',
  'Managing Director': 'managingDirector',
  'Warehouse Manager': 'warehouseManager',
  Distributor: 'distributor',
  Salesman: 'salesman',
  'Order Booker': 'orderBooker',
  customer: 'customer',
  'Account Officer': 'accountOfficer',
  'HR Assistant': 'hrAssistant',
  Cashier: 'cashier',
  KPO: 'kpo',
  'Brand Manager': 'brandManager',
  'National Sale Manager': 'nationalSM',
  'Regional Sale Manager': 'regionalSM',
  'Zone Sale Manager': 'zoneSM',
  'Territory Sale Manager': 'territorySM',
  'Field Sale Manager': 'fieldSM',
  'Delivery Boy': 'deliveryBoy',
};

export function roleToMenuKey(role) {
  return ROLE_KEY_MAP[role] || 'admin';
}