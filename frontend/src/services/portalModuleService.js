import apiClient from "./apiClient";
function qs(params = {}) { return new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")).toString(); }
export const portalModuleService = {
  list: (params = {}) => apiClient(`/portal-modules?${qs(params)}`),
  seed: () => apiClient("/portal-modules/seed", { method: "POST" }),
  upsert: (data) => apiClient("/portal-modules", { method: "POST", body: JSON.stringify(data) }),
};
export default portalModuleService;
