import { roleToMenuKey } from '../utils/roleRedirect';

export const roleMenus = {
  admin: ['Operations', 'Sales KPI', 'Companies', 'Products', 'Warehouse', 'Orders', 'Reports', 'Settings'],
  ceo: ['Executive Dashboard', 'Reports'],
  managingDirector: ['Executive Dashboard', 'Operations', 'Reports'],
  warehouseManager: ['Dashboard', 'Warehouse & Inventory', 'Order Management', 'Payments'],
  distributor: ['Dashboard', 'Expenses', 'Receipts', 'Payments', 'Orders', 'Messages'],
  salesman: ['Dashboard', 'Deliveries'],
  orderBooker: ['Dashboard', 'Secondary Sale Requests', 'Receipts'],
  customer: ['Dashboard', 'Order Requests', 'Receipts', 'Settings'],
  accountOfficer: ['Dashboard', 'Accounts', 'Reports'],
  hrAssistant: ['Dashboard', 'HR'],
  cashier: ['Dashboard', 'Cash Management'],
  kpo: ['Dashboard', 'KPI'],
  brandManager: ['Dashboard', 'Primary Orders', 'Returns', 'Messages'],
  nationalSM: ['Dashboard', 'Sales Summary'],
  regionalSM: ['Dashboard', 'Regional Sales'],
  zoneSM: ['Dashboard', 'Zone Sales'],
  territorySM: ['Dashboard', 'Territory Sales'],
  fieldSM: ['Dashboard', 'Field Operations'],
  deliveryBoy: ['Dashboard', 'Proof of Delivery'],
};

export function getRoleMenu(role) {
  const key = roleToMenuKey(role);
  return roleMenus[key] || roleMenus.admin;
}
