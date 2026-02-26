import { APP_ROLES } from '../config/env';

export const roleModules = {
  [APP_ROLES.ADMIN]: [
    'Orders', 'Payment Management', 'Account Management', 'Insights', 'Expense Management',
    'Employee Support', 'Vehicle Management', 'Finance & Accounts', 'User Management'
  ],
  [APP_ROLES.WAREHOUSE_MANAGER]: ['Orders', 'Dispatch Management', 'Inventory', 'Proof of Delivery', 'Reports'],
  [APP_ROLES.DISTRIBUTOR]: ['Orders', 'Payment', 'Expenses', 'Claims', 'Offer Schemes', 'Receipts', 'Aging Report'],
  [APP_ROLES.SALESMAN]: ['Deliveries', 'Vehicle Trips', 'Maintenance', 'Notifications'],
  [APP_ROLES.ORDERBOOKER]: ['Create Secondary Order', 'My Orders', 'Receipts Entry'],
  [APP_ROLES.CUSTOMER]: ['Create Order', 'View Orders', 'Create Receipt', 'Payment History', 'Outstanding Balance'],
  [APP_ROLES.ACCOUNT_OFFICER]: ['Accounts List', 'Transactions', 'Loan Management', 'Insights'],
  [APP_ROLES.CEO]: ['Executive Summary', 'Approvals', 'Analytics'],
  [APP_ROLES.MANAGING_DIRECTOR]: ['Executive Summary', 'Approvals', 'Analytics']
};
