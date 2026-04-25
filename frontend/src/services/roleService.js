import apiClient from "./apiClient";
function qs(params = {}) { return new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")).toString(); }
export const roleService = {
  list: (params = {}) => apiClient(`/roles?${qs(params)}`),
  options: (params = {}) => apiClient(`/roles/options?${qs(params)}`),
  seedDefaults: (data = {}) => apiClient("/roles/seed-defaults", { method: "POST", body: JSON.stringify(data) }),
  create: (data) => apiClient("/roles", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => apiClient(`/roles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id) => apiClient(`/roles/${id}`, { method: "DELETE" }),
};
export default roleService;
