import { flattenNavigation, getAdminNavigation, USER_ROLE_LINKS } from "../lib/dashboardRegistry";

export const adminDashboardSearchItems = flattenNavigation(getAdminNavigation({ canAccessCompanyManagement: true }));
export const userDashboardSearchItems = USER_ROLE_LINKS;
