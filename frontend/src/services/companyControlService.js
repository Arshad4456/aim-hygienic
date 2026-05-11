import apiClient from "./apiClient";
export function fetchCompanyControlCenter() { return apiClient("/company-control/overview"); }
export default { fetchCompanyControlCenter };
