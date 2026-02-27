import moduleMap from './moduleMap.json';
import { toTitle } from '../utils/routeTitle';

export const roleMenuConfig = moduleMap.reduce((acc, mod) => {
  if (!acc[mod.role]) acc[mod.role] = [];
  acc[mod.role].push({
    key: mod.key,
    title: toTitle(mod.modulePath || 'dashboard'),
    modulePath: mod.modulePath,
    screenFile: mod.screenFile,
    endpoints: mod.endpoints || [],
  });
  return acc;
}, {});

export function getRoleModules(role) {
  return roleMenuConfig[role] || roleMenuConfig.admin || [];
}