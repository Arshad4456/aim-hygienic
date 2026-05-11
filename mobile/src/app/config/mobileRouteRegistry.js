import { MOBILE_MODULE_DETAILS, MOBILE_ROLE_MODULES } from './mobileErpAccess';

export const MOBILE_ROUTE_REGISTRY = Object.fromEntries(
  Object.entries(MOBILE_MODULE_DETAILS).map(([key, item]) => [key, {
    label: item.title,
    feature: key,
    group: item.group,
    screen: item.screen,
    roles: Object.entries(MOBILE_ROLE_MODULES)
      .filter(([, modules]) => modules.includes(key))
      .map(([role]) => role),
  }])
);

export function getMobileModulesForRole(role) {
  const modules = MOBILE_ROLE_MODULES[role] || [];
  return modules
    .map((key) => MOBILE_ROUTE_REGISTRY[key] ? ({ key, ...MOBILE_ROUTE_REGISTRY[key] }) : null)
    .filter(Boolean);
}

export default MOBILE_ROUTE_REGISTRY;
