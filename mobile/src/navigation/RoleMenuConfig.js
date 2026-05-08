import moduleMap from './moduleMap.json';
import { toTitle } from '../utils/routeTitle';
import { buildMobileMenuForUser, normalizeMobileRole } from '../config/mobileErpAccess';

export const roleMenuConfig = moduleMap.reduce((acc, mod) => {
  if (!acc[mod.role]) acc[mod.role] = [];
  acc[mod.role].push({
    key: mod.key,
    title: mod.title || toTitle(mod.modulePath || 'dashboard'),
    modulePath: mod.modulePath,
    screenFile: mod.screenFile,
    endpoints: mod.endpoints || [],
  });
  return acc;
}, {});

function normalizeLegacyAdminMenu(role, user = {}) {
  const erpTemplateKey = String(user?.erpTemplateKey || user?.company?.erpTemplateKey || user?.businessType || user?.company?.businessType || '').toLowerCase();
  const legacy = roleMenuConfig[role] || [];
  if (!legacy.length) return [];

  if (!erpTemplateKey || erpTemplateKey === 'distribution_erp') return legacy;

  const allowedByErp = {
    retail_pos_erp: ['dashboard', 'products', 'customers', 'warehouses', 'warehouse-inventory', 'inventory', 'finance', 'reports', 'settings', 'retail-pos', 'users'],
    manufacturing_erp: ['dashboard', 'products', 'warehouses', 'warehouse-inventory', 'inventory', 'finance', 'reports', 'settings', 'manufacturing', 'quality', 'procurement', 'users'],
    service_erp: ['dashboard', 'customers', 'products', 'inventory', 'finance', 'reports', 'settings', 'service', 'users'],
    trading_erp: ['dashboard', 'companies', 'products', 'customers', 'suppliers', 'warehouses', 'warehouse-inventory', 'inventory', 'finance', 'reports', 'settings', 'trading', 'procurement', 'users'],
    custom_erp: null,
  }[erpTemplateKey];

  if (!allowedByErp) return legacy;
  return legacy.filter((mod) => {
    const path = String(mod.modulePath || 'dashboard').toLowerCase();
    return allowedByErp.some((allowed) => path === allowed || path.startsWith(`${allowed}/`));
  });
}

export function getRoleModules(role, user = {}) {
  const normalizedRole = normalizeMobileRole(role || user?.role || user?.roleName || user?.portalType);
  const modernMenu = buildMobileMenuForUser(normalizedRole, user);
  if (modernMenu?.length) return modernMenu;
  return normalizeLegacyAdminMenu(role, user) || roleMenuConfig[role] || roleMenuConfig.admin || [];
}
