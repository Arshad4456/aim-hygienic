export const AIM_USER_ROLES = [
  'superAdmin',
  'systemAdmin',
  'executive',
  'salesManager',
  'salesOps',
  'warehouseManager',
  'inventoryController',
  'financeOfficer',
  'cashier',
  'hrOfficer',
  'procurementManager',
  'logisticsCoordinator',
  'qualityManager',
  'distributor',
  'orderBooker',
  'salesman',
  'deliveryExecutive',
  'customerSupport',
  'auditor',
];

export const COMMON_USER_FIELDS = ['fullName', 'email', 'mobileNumber', 'cnicNo', 'address'];

export const ROLE_EXTRA_FIELDS = {
  superAdmin: [],
  systemAdmin: [],
  executive: [],
  salesManager: ['warehouse', 'region', 'zone', 'territory'],
  salesOps: ['warehouse'],
  warehouseManager: ['warehouse'],
  inventoryController: ['warehouse'],
  financeOfficer: ['warehouse'],
  cashier: ['warehouse'],
  hrOfficer: ['warehouse'],
  procurementManager: ['warehouse'],
  logisticsCoordinator: ['warehouse', 'region', 'zone', 'territory'],
  qualityManager: ['warehouse'],
  distributor: ['warehouse', 'region', 'zone', 'territory'],
  orderBooker: ['warehouse', 'region', 'zone', 'territory', 'field'],
  salesman: ['warehouse', 'region', 'zone', 'territory', 'field'],
  deliveryExecutive: ['warehouse', 'region', 'zone', 'territory', 'field'],
  customerSupport: ['warehouse'],
  auditor: [],
};

export function validatePassword(value) {
  if (!value || value.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[0-9]/.test(value)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(value)) return 'Password must include at least one symbol.';
  return '';
}

export const FIELD_LABELS = {
  fullName: 'Name',
  email: 'Email',
  mobileNumber: 'Mobile Number',
  cnicNo: 'CNIC No',
  password: 'Password',
  address: 'Address',
  userId: 'User ID',
  role: 'Role',
  warehouseName: 'Warehouse Name',
  regionName: 'Region Name',
  zoneName: 'Zone Name',
  territoryName: 'Territory Name',
  fieldName: 'Field Name',
  businessType: 'Business Type',
  businessName: 'Business Name',
};