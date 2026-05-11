import apiClient from "@/src/app/infrastructure/api/apiClient";

function withPeriod(path, period = "month", extra = {}) {
  const params = new URLSearchParams({ period, ...extra });
  return `${path}?${params.toString()}`;
}

export function overview(period = "month", extra = {}) {
  return apiClient(withPeriod("/reports/overview", period, extra));
}

export function master(period = "month", extra = {}) {
  return apiClient(withPeriod("/reports/master", period, extra));
}

export function builder(period = "month", extra = {}) {
  return apiClient(withPeriod("/reports/builder", period, extra));
}

export function focused(moduleKey, period = "month", extra = {}) {
  return apiClient(withPeriod(`/reports/focus/${encodeURIComponent(moduleKey)}`, period, extra));
}

export function finance(period = "month", extra = {}) {
  return apiClient(withPeriod("/reports/finance", period, extra));
}

export function logistics(period = "month", extra = {}) {
  return apiClient(withPeriod("/reports/logistics", period, extra));
}

export function procurement(period = "month", extra = {}) {
  return apiClient(withPeriod("/reports/procurement", period, extra));
}

const reportsService = { overview, master, builder, focused, finance, logistics, procurement };
export default reportsService;
