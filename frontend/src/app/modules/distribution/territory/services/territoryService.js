import apiClient from "@/src/app/infrastructure/api/apiClient";

function toQuery(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  ).toString();
  return qs ? `?${qs}` : "";
}

export const territoryService = {
  overview: (params = {}) => apiClient(`/territory/overview${toQuery(params)}`),
  hierarchy: (params = {}) => apiClient(`/territory/hierarchy${toQuery(params)}`),
};

export default territoryService;
