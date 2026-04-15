import { flattenNavigation, getAdminNavigation, sanitizeRoleLinks, USER_ROLE_LINKS } from "../lib/dashboardRegistry";

export const adminDashboardSearchItems = flattenNavigation(getAdminNavigation({ canAccessCompanyManagement: true }));
export const userDashboardSearchItems = Object.fromEntries(Object.entries(USER_ROLE_LINKS).map(([key, value]) => [key, sanitizeRoleLinks(value)]));
