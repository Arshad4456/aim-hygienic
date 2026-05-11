import apiClient from "@/src/app/infrastructure/api/apiClient";

function qs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== "") search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

const notificationService = {
  overview: (params = {}) => apiClient(`/notifications/overview${qs(params)}`),
  list: (params = {}) => apiClient(`/notifications${qs(params)}`),
  create: (payload) => apiClient("/notifications", { method: "POST", body: JSON.stringify(payload) }),
  trigger: (payload) => apiClient("/notifications/trigger", { method: "POST", body: JSON.stringify(payload) }),
  markRead: (id) => apiClient(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => apiClient("/notifications/read-all", { method: "PATCH" }),
  remove: (id) => apiClient(`/notifications/${id}`, { method: "DELETE" }),
};

export default notificationService;
