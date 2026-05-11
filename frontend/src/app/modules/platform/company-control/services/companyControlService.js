import apiClient from "@/src/app/infrastructure/api/apiClient";
export function fetchCompanyControlCenter() { return apiClient("/company-control/overview"); }
export default { fetchCompanyControlCenter };
