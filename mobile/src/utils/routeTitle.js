const OVERRIDES = {
  dashboard: 'Dashboard',
  'warehouse-inventory': 'Warehouse & Inventory',
  'order-management': 'Order Management',
  'fuel-management': 'Fuel Management',
  'finance/aging': 'Aging Report',
  'primary-order-request': 'Primary Order Request',
  'live-tracking': 'Live Tracking',
  'sales-kpi': 'Sales KPI',
};

export function toTitle(modulePath = '') {
  const normalized = String(modulePath || '').replace(/^\/+|\/+$/g, '');
  if (!normalized) return OVERRIDES.dashboard;
  if (OVERRIDES[normalized]) return OVERRIDES[normalized];

  const parts = normalized.split('/');
  const last = parts[parts.length - 1];
  return last
    .split('-')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}