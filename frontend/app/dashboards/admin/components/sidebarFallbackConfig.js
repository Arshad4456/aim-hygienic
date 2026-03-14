import { MODULE_CATALOG } from '../../../lib/platform/moduleCatalog';

const runtimeModuleLinks = Object.values(MODULE_CATALOG).map((module, index) => ({
  title: module.label,
  href: `/runtime-dashboard/${module.code}`,
  code: module.code,
  order: index + 1,
}));

export const adminSidebarFallbackConfig = [
  {
    type: 'group',
    key: 'platform',
    title: 'Platform & Runtime',
    icon: 'settings',
    children: [
      { title: 'Admin Overview', href: '/dashboards/admin' },
      { title: 'Runtime Dashboard', href: '/runtime-dashboard' },
      { title: 'Super Admin Home', href: '/dashboards/superadmin' },
      { title: 'Runtime Preview', href: '/dashboards/superadmin/runtime-preview' },
      { title: 'Companies', href: '/platform-admin/companies' },
      { title: 'Setup Templates', href: '/platform-admin/setup-templates' },
      { title: 'Plans & Subscriptions', href: '/platform-admin/plans' },
      { title: 'Platform Analytics', href: '/platform-admin/analytics' },
      { title: 'Audit Logs', href: '/platform-admin/audit-logs' },
    ],
  },
  {
    type: 'group',
    key: 'runtimeModules',
    title: 'Runtime Modules',
    icon: 'dashboard',
    children: runtimeModuleLinks,
  },
];
