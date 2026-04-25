import apiClient from "./apiClient";
export const roleService = { list: (params = {}) => apiClient(`/roles?${new URLSearchParams(params).toString()}`), create: (data) => apiClient("/roles", { method: "POST", body: JSON.stringify(data) }), update: (id, data) => apiClient(`/roles/${id}`, { method: "PUT", body: JSON.stringify(data) }), remove: (id) => apiClient(`/roles/${id}`, { method: "DELETE" }) };
export default roleService;
