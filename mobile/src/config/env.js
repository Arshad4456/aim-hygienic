export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-vps-domain.com';

export const API_TIMEOUT_MS = 20000;

export const APP_ROLES = {
  ADMIN: 'admin',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  DISTRIBUTOR: 'distributor',
  SALESMAN: 'salesman',
  ORDERBOOKER: 'orderbooker',
  CUSTOMER: 'customer',
  ACCOUNT_OFFICER: 'account_officer',
  CEO: 'ceo',
  MANAGING_DIRECTOR: 'managing_director'
};
