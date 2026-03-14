const MODULE_CATALOG = {
  territory_assets: { moduleCode: 'territory_assets', moduleName: 'Territory & Assets', category: 'master_data', icon: '🧭', supportsRuntimePreview: true, defaultSections: ['warehouses','regions','zones','territories','fields','vehicles'], defaultActions: ['create','read','update','delete'] },
  hr_role_management: { moduleCode: 'hr_role_management', moduleName: 'HR & Role Management', category: 'administration', icon: '👥', supportsRuntimePreview: true, defaultSections: ['users','roles'], defaultActions: ['create','read','update','delete','assign'] },
  order_management: { moduleCode: 'order_management', moduleName: 'Order Management', category: 'operations', icon: '🧺', supportsRuntimePreview: true, defaultSections: ['primary_orders','secondary_orders','approvals','dispatch','returns'], defaultActions: ['create','read','update','delete','approve','dispatch'] },
  payment_management: { moduleCode: 'payment_management', moduleName: 'Payment Management', category: 'finance', icon: '💸', supportsRuntimePreview: true, defaultSections: ['primary_payments','secondary_payments','ledgers'], defaultActions: ['create','read','update','delete','approve'] },
  expense_management: { moduleCode: 'expense_management', moduleName: 'Expense Management', category: 'finance', icon: '🧾', supportsRuntimePreview: true, defaultSections: ['personal','daily','distributor'], defaultActions: ['create','read','update','delete','approve'] },
  finance_accounts: { moduleCode: 'finance_accounts', moduleName: 'Finance & Accounts', category: 'finance', icon: '💰', supportsRuntimePreview: true, defaultSections: ['invoices','receipts','aging'], defaultActions: ['create','read','update','delete','approve','print','export'] },
  vehicle_management: { moduleCode: 'vehicle_management', moduleName: 'Vehicle Management', category: 'operations', icon: '🚘', supportsRuntimePreview: true, defaultSections: ['vehicles','fuel_management','maintenance'], defaultActions: ['create','read','update','delete','upload_proof'] },
};

function getModuleMeta(moduleCode) {
  const code = String(moduleCode || '').trim().toLowerCase();
  return MODULE_CATALOG[code] || { moduleCode: code, moduleName: code.replace(/_/g, ' ').replace(/\w/g, (m) => m.toUpperCase()), category: 'general', icon: '•', supportsRuntimePreview: true, defaultSections: [], defaultActions: [] };
}

module.exports = { MODULE_CATALOG, getModuleMeta };
