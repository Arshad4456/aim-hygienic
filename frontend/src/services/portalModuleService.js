import apiClient from "./apiClient";
export const portalModuleService = { list: (params = {}) => apiClient(`/portal-modules?${new URLSearchParams(params).toString()}`), seed: () => apiClient("/portal-modules/seed", { method: "POST" }), upsert: (data) => apiClient("/portal-modules", { method: "POST", body: JSON.stringify(data) }) };
export default portalModuleService;
