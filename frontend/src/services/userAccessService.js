import apiClient from "./apiClient";
function qs(params = {}) { return new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")).toString(); }
export const userAccessService = {
  listUsers: (params = {}) => apiClient(`/user-access/users?${qs(params)}`),
  getUser: (id) => apiClient(`/user-access/users/${id}`),
  assignRole: (id, roleId) => apiClient(`/user-access/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ roleId }) }),
  updateAccess: (id, data) => apiClient(`/user-access/users/${id}/access`, { method: "PATCH", body: JSON.stringify(data) }),
  setStatus: (id, status) => apiClient(`/user-access/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
export default userAccessService;
