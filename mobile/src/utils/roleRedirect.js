import { normalizeRoleCode } from './permissions';

const ROLE_TO_DASHBOARD = {
  systemAdmin: 'admin',
  superAdmin: 'admin',
  executive: 'ceo',
  warehouseManager: 'warehouseManager',
  financeOfficer: 'accountOfficer',
  hrOfficer: 'hrAssistant',
  cashier: 'cashier',
  salesOps: 'brandManager',
  salesManager: 'regionalSM',
  distributor: 'distributor',
  orderBooker: 'orderBooker',
  salesman: 'salesman',
  deliveryExecutive: 'deliveryBoy',
};

export function roleToDashboardKey(role) {
  return ROLE_TO_DASHBOARD[normalizeRoleCode(role)] || 'admin';
}

export function isKnownRole(role) {
  return Boolean(ROLE_TO_DASHBOARD[normalizeRoleCode(role)]);
}
