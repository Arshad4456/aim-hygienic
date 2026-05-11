import apiClient, { apiPatch, apiPost } from "@/src/app/infrastructure/api/apiClient";

export async function fetchSystemAdminOverview() { return apiClient("/system-admin/overview"); }
export async function fetchSystemAdminCompanies() { return apiClient("/system-admin/companies"); }
export async function seedSystemAdminDefaults() { return apiClient("/system-admin/seed-defaults", { method: "POST" }); }
export async function createClientCompany(payload) { return apiPost("/system-admin/companies", payload || {}); }
export async function updateCompanyControl(companyId, payload) { return apiPatch(`/system-admin/companies/${encodeURIComponent(companyId)}/control`, payload || {}); }
export async function saveSubscriptionPlan(payload) { return apiPost("/system-admin/subscription-plans", payload || {}); }
export async function updateModuleControl(moduleKey, payload) { return apiPatch(`/system-admin/modules/${encodeURIComponent(moduleKey)}`, payload || {}); }
export async function fetchCompanyLimits(companyId) { return apiClient(`/system-admin/companies/${encodeURIComponent(companyId)}/limits`); }
export async function createSystemAdminUser(payload) { return apiPost("/system-admin/users/system-admin", payload || {}); }
export async function bootstrapSystemAdmin(payload) { return apiPost("/system-admin/bootstrap-system-admin", payload || {}); }

export default {
  fetchSystemAdminOverview,
  fetchSystemAdminCompanies,
  seedSystemAdminDefaults,
  createClientCompany,
  updateCompanyControl,
  saveSubscriptionPlan,
  updateModuleControl,
  fetchCompanyLimits,
  createSystemAdminUser,
  bootstrapSystemAdmin,
};
