export const MODULE_CATALOG = {
  territory_assets: { code: 'territory_assets', label: 'Territory & Assets', category: 'master_data', icon: '🧭' },
  hr_role_management: { code: 'hr_role_management', label: 'HR & Role Management', category: 'administration', icon: '👥' },
  order_management: { code: 'order_management', label: 'Order Management', category: 'operations', icon: '🧺' },
  payment_management: { code: 'payment_management', label: 'Payment Management', category: 'finance', icon: '💸' },
  expense_management: { code: 'expense_management', label: 'Expense Management', category: 'finance', icon: '🧾' },
  finance_accounts: { code: 'finance_accounts', label: 'Finance & Accounts', category: 'finance', icon: '💰' },
  vehicle_management: { code: 'vehicle_management', label: 'Vehicle Management', category: 'operations', icon: '🚘' },
};

export function getModuleMeta(moduleCode) {
  const code = String(moduleCode || '').trim().toLowerCase();
  return MODULE_CATALOG[code] || { code, label: code.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()), category: 'general', icon: '•' };
}
