import apiClient from "./apiClient";

export async function fetchSystemAdminOverview() {
  return apiClient("/system-admin/overview");
}

export async function seedSystemAdminDefaults() {
  return apiClient("/system-admin/seed-defaults", { method: "POST" });
}

export async function updateCompanyControl(companyId, payload) {
  return apiClient(`/system-admin/companies/${encodeURIComponent(companyId)}/control`, {
    method: "PATCH",
    body: JSON.stringify(payload || {}),
  });
}

export async function saveSubscriptionPlan(payload) {
  return apiClient("/system-admin/subscription-plans", {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

export async function fetchCompanyLimits(companyId) {
  return apiClient(`/system-admin/companies/${encodeURIComponent(companyId)}/limits`);
}

export default {
  fetchSystemAdminOverview,
  seedSystemAdminDefaults,
  updateCompanyControl,
  saveSubscriptionPlan,
  fetchCompanyLimits,
};
