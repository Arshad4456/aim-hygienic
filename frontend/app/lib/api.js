import { getAuthItem } from "./clientAuth";

function normalizeApiBase(rawApiBase) {
  const apiBase = rawApiBase?.trim().replace(/\/$/, "") || "";
  if (!apiBase) return "/api";

  if (/^https?:\/\//i.test(apiBase)) {
    return /\/api(\/|$)/.test(apiBase) ? apiBase : `${apiBase}/api`;
  }

  if (apiBase.startsWith("/")) {
    return /\/api(\/|$)/.test(apiBase) ? apiBase : `${apiBase}/api`;
  }

  const withProtocol = `http://${apiBase}`;
  return /\/api(\/|$)/.test(withProtocol) ? withProtocol : `${withProtocol}/api`;
}

function toHttpsIfNeeded(base) {
  if (typeof window === "undefined") return base;

  const isHttpsPage = window.location.protocol === "https:";
  const isHttpBase = /^http:\/\//i.test(base);
  const pointsToLocalApi = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(base);

  if (isHttpsPage && isHttpBase && !pointsToLocalApi) {
    return base.replace(/^http:/i, "https:");
  }

  return base;
}

function isBrowserSafeFallback(base) {
  if (typeof window === "undefined") return true;
  if (!base || base === "/api") return false;
  if (base.startsWith("/")) return true;

  try {
    const parsed = new URL(base);
    return parsed.origin === window.location.origin;
  } catch {
    return false;
  }
}

function resolveApiCandidates() {
  const normalized = normalizeApiBase(process.env.NEXT_PUBLIC_API_BASE);
  const normalizedHttps = toHttpsIfNeeded(normalized);
  const fallbackCandidates = isBrowserSafeFallback(normalizedHttps) ? [normalizedHttps] : [];
  const emergencyFallbackCandidates =
    normalizedHttps && normalizedHttps !== "/api" && !fallbackCandidates.includes(normalizedHttps)
      ? [normalizedHttps]
      : [];

  if (typeof window !== "undefined") {
    const isLocalHost = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(window.location.host);
    const allowCrossOriginFallback = process.env.NEXT_PUBLIC_ALLOW_CROSS_ORIGIN_API_FALLBACK === "1";

    // In production/browser prefer same-origin /api first to avoid CORS and rely on reverse proxy.
    if (!isLocalHost) {
      // Keep production requests same-origin first to avoid CORS failures between apex/www hosts.
      // Cross-origin retries are opt-in because browser preflight can fail and mask the original API error.
      return allowCrossOriginFallback
        ? ["/api", ...fallbackCandidates, ...emergencyFallbackCandidates]
        : ["/api", ...fallbackCandidates];
    }
  }

  const candidates = [normalizedHttps];
  if (typeof window !== "undefined" && candidates[0] !== "/api") {
    candidates.push("/api");
  }
  return [...new Set(candidates)];
}

async function fetchJson(url, { method, body, headers, credentials }) {
  const res = await fetch(url, {
    method,
    headers,
    credentials,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    const error = new Error(msg);
    error.status = res.status;
    throw error;
  }

  return data;
}

function isNetworkError(error) {
  return /Failed to fetch|NetworkError|Could not reach the API server/i.test(error?.message || "");
}

function isRetriableStatus(error) {
  const status = Number(error?.status || 0);
  return status === 502 || status === 503 || status === 504;
}

export async function apiFetch(path, { method = "GET", body, token, credentials } = {}) {
  const t = token || (typeof window !== "undefined" ? getAuthItem("aim_token") : null);
  const headers = {
    "Content-Type": "application/json",
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
  };

  const candidates = resolveApiCandidates();
  let lastError = null;
  const normalizedMethod = String(method || "GET").toUpperCase();
  const hasMultipleCandidates = candidates.length > 1;
  const canRetryAcrossBases = hasMultipleCandidates && ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"].includes(normalizedMethod);

  for (const baseUrl of candidates) {
    try {
      return await fetchJson(`${baseUrl}${path}`, { method, body, headers, credentials });
    } catch (error) {
      lastError = error;
      if (!canRetryAcrossBases || (!isNetworkError(error) && !isRetriableStatus(error))) {
        throw error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(
    "Could not reach the API server. Verify NEXT_PUBLIC_API_BASE/API_BASE configuration and that the backend is running.",
  );
}

export function withQuery(path, params = {}) {
  const url = new URL(path, "http://v2.local");
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });
  return `${url.pathname}${url.search}`;
}

export function apiGet(path, options = {}) {
  return apiFetch(path, { ...options, method: "GET" });
}

export function apiPost(path, body = {}, options = {}) {
  return apiFetch(path, { ...options, method: "POST", body });
}

export function apiPut(path, body = {}, options = {}) {
  return apiFetch(path, { ...options, method: "PUT", body });
}

export function apiPatch(path, body = {}, options = {}) {
  return apiFetch(path, { ...options, method: "PATCH", body });
}

export function apiDelete(path, body = undefined, options = {}) {
  return apiFetch(path, { ...options, method: "DELETE", body });
}

export const v2Api = {
  orders: {
    list: (params = {}) => apiGet(withQuery("/orders", params)),
    create: (payload, params = {}) => apiPost(withQuery("/orders", params), payload),
    approve: (id, params = {}) => apiPost(withQuery(`/orders/${id}/approve`, params), {}),
  },
  inventory: {
    ledger: (params = {}) => apiGet(withQuery("/inventory/ledger", params)),
    createCompanyDispatch: (payload) => apiPost("/inventory/company-dispatches", payload),
    postCompanyDispatch: (id) => apiPost(`/inventory/company-dispatches/${id}/post`, {}),
    createDistributorReceipt: (payload) => apiPost("/inventory/distributor-stock-receipts", payload),
    postDistributorReceipt: (id) => apiPost(`/inventory/distributor-stock-receipts/${id}/post`, {}),
  },
  receipts: {
    list: (params = {}) => apiGet(withQuery("/receipts", params)),
    listInvoices: (params = {}) => apiGet(withQuery("/receipts/invoices", params)),
    create: (payload, params = {}) => apiPost(withQuery("/receipts", params), payload),
    post: (id, params = {}) => apiPost(withQuery(`/receipts/${id}/post`, params), {}),
  },
  payments: {
    listSupplierInvoices: (params = {}) => apiGet(withQuery("/payments/supplier-invoices", params)),
    createSupplierInvoice: (payload) => apiPost("/payments/supplier-invoices", payload),
    postSupplierInvoice: (id) => apiPost(`/payments/supplier-invoices/${id}/post`, {}),
    listSupplierPayments: (params = {}) => apiGet(withQuery("/payments/supplier-payments", params)),
    createSupplierPayment: (payload) => apiPost("/payments/supplier-payments", payload),
    postSupplierPayment: (id) => apiPost(`/payments/supplier-payments/${id}/post`, {}),
  },

  dashboard: {
    overview: (params = {}) => apiGet(withQuery("/dashboard/overview", params)),
    operations: (params = {}) => apiGet(withQuery("/dashboard/operations", params)),
    salesManager: (params = {}) => apiGet(withQuery("/dashboard/sales-manager", params)),
    salesKpi: (params = {}) => apiGet(withQuery("/sales-kpi/summary", params)),
  },

  reports: {
    overview: (params = {}) => apiGet(withQuery("/reports/overview", params)),
    inventory: (params = {}) => apiGet(withQuery("/reports/inventory", params)),
    finance: (params = {}) => apiGet(withQuery("/reports/finance", params)),
    procurement: (params = {}) => apiGet(withQuery("/reports/procurement", params)),
    logistics: (params = {}) => apiGet(withQuery("/reports/logistics", params)),
  },

  finance: {
    overview: (params = {}) => apiGet(withQuery("/reports/finance", params)),
    listDistributors: (params = {}) => apiGet(withQuery("/users", { role: "Distributor", ...params })),
    listCompanyInvoices: (params = {}) => apiGet(withQuery("/receipts/invoices", { family: "company_distributor", ...params })),
    createCompanyInvoice: (payload, params = {}) => apiPost(withQuery("/receipts/invoices", { family: "company_distributor", ...params }), payload),
    postCompanyInvoice: (id, params = {}) => apiPost(withQuery(`/receipts/invoices/${id}/post`, { family: "company_distributor", ...params }), {}),
    listCompanyReceipts: (params = {}) => apiGet(withQuery("/receipts", { family: "company_distributor", ...params })),
    createCompanyReceipt: (payload, params = {}) => apiPost(withQuery("/receipts", { family: "company_distributor", ...params }), payload),
    postCompanyReceipt: (id, params = {}) => apiPost(withQuery(`/receipts/${id}/post`, { family: "company_distributor", ...params }), {}),
    listCompanyOpenOrders: (params = {}) => apiGet(withQuery("/receipts/orders/open", { family: "company_distributor", ...params })),
    listSupplierInvoices: (params = {}) => apiGet(withQuery("/payments/supplier-invoices", params)),
    createSupplierInvoice: (payload) => apiPost("/payments/supplier-invoices", payload),
    postSupplierInvoice: (id) => apiPost(`/payments/supplier-invoices/${id}/post`, {}),
    listSupplierPayments: (params = {}) => apiGet(withQuery("/payments/supplier-payments", params)),
    createSupplierPayment: (payload) => apiPost("/payments/supplier-payments", payload),
    postSupplierPayment: (id) => apiPost(`/payments/supplier-payments/${id}/post`, {}),
  },

  warehouseManager: {
    overview: (params = {}) => apiGet(withQuery("/dashboard/operations", params)),
    inventoryReport: (params = {}) => apiGet(withQuery("/reports/inventory", params)),
    ledger: (params = {}) => apiGet(withQuery("/inventory/ledger", params)),
    listCompanySupplyOrders: (params = {}) => apiGet(withQuery("/orders", { family: "company_supply", ...params })),
    listCompanyDispatches: (params = {}) => apiGet(withQuery("/inventory/company-dispatches", params)),
    createCompanyDispatch: (payload) => apiPost("/inventory/company-dispatches", payload),
    postCompanyDispatch: (id) => apiPost(`/inventory/company-dispatches/${id}/post`, {}),
    lowStock: (params = {}) => apiGet(withQuery("/inventory/low-stock", params)),
    nearExpiry: (params = {}) => apiGet(withQuery("/inventory/near-expiry-products", params)),
    listWarehouses: (params = {}) => apiGet(withQuery("/warehouses", params)),
  },
  logistics: {
    overview: (params = {}) => apiGet(withQuery("/reports/logistics", params)),
    operations: (params = {}) => apiGet(withQuery("/dashboard/operations", params)),
    listCompanyDispatches: (params = {}) => apiGet(withQuery("/inventory/company-dispatches", params)),
    createCompanyDispatch: (payload) => apiPost("/inventory/company-dispatches", payload),
    postCompanyDispatch: (id) => apiPost(`/inventory/company-dispatches/${id}/post`, {}),
    listCompanySupplyOrders: (params = {}) => apiGet(withQuery("/orders", { family: "company_supply", ...params })),
    listVehicles: (params = {}) => apiGet(withQuery("/vehicles", params)),
    listUsers: (params = {}) => apiGet(withQuery("/users", params)),
    listWarehouses: (params = {}) => apiGet(withQuery("/warehouses", params)),
    listRegions: (params = {}) => apiGet(withQuery("/regions", params)),
    listZones: (params = {}) => apiGet(withQuery("/zones", params)),
    listAreas: (params = {}) => apiGet(withQuery("/areas", params)),
    listLiveUsers: () => apiGet("/location/live-users"),
  },

  procurement: {
    overview: (params = {}) => apiGet(withQuery("/reports/procurement", params)),
    suppliers: (params = {}) => apiGet(withQuery("/users", { role: "Supplier", ...params })),
    supplierById: async (id, params = {}) => {
      if (!id) return { ok: true, user: null };
      try {
        return await apiGet(withQuery(`/users/${id}`, params));
      } catch (_error) {
        const list = await apiGet(withQuery("/users", { role: "Supplier", ...params }));
        const matched = (list?.users || []).find((item) => String(item?._id || item?.id || "") === String(id));
        return { ok: true, user: matched || null };
      }
    },
    purchaseOrders: (params = {}) => apiGet(withQuery("/inventory/ledger", params)),
    goodsReceipts: (params = {}) => apiGet(withQuery("/inventory/ledger", params)),
    supplierInvoices: (params = {}) => apiGet(withQuery("/payments/supplier-invoices", params)),
    supplierPayments: (params = {}) => apiGet(withQuery("/payments/supplier-payments", params)),
    supplierPrimaryOrders: () => apiGet("/inventory/transactions/supplier/primary"),
  },


  distributor: {
    overview: (params = {}) => apiGet(withQuery("/dashboard/overview", params)),
    salesKpi: (params = {}) => apiGet(withQuery("/sales-kpi/summary", params)),
    inventoryReport: (params = {}) => apiGet(withQuery("/reports/inventory", params)),
    financeReport: (params = {}) => apiGet(withQuery("/reports/finance", params)),
    inventoryLedger: (params = {}) => apiGet(withQuery("/inventory/ledger", { ownerType: "distributor", ...params })),
    lowStock: (params = {}) => apiGet(withQuery("/inventory/low-stock", params)),
    nearExpiry: (params = {}) => apiGet(withQuery("/inventory/near-expiry-products", params)),
    listReturns: (params = {}) => apiGet(withQuery("/returns", params)),
    listSecondaryOrders: (params = {}) => apiGet(withQuery("/orders", { family: "secondary", ...params })),
    listCustomerReceipts: (params = {}) => apiGet(withQuery("/receipts", { family: "distributor_customer", ...params })),
    listCustomerInvoices: (params = {}) => apiGet(withQuery("/receipts/invoices", { family: "distributor_customer", ...params })),
    listCompanyInvoices: (params = {}) => apiGet(withQuery("/receipts/invoices", { family: "company_distributor", ...params })),
    listExpenses: (params = {}) => apiGet(withQuery("/expenses", params)),
  },

  systemAdmin: {
    listCompanies: () => apiGet("/companies"),
    getCompany: (id) => apiGet(`/companies/${id}`),
    createCompany: (payload) => apiPost("/companies", payload),
    updateCompany: (id, payload) => apiPut(`/companies/${id}`, payload),
    deleteCompany: (id) => apiDelete(`/companies/${id}`),
    getModuleAccess: (companyId = "") => apiGet(withQuery("/module-access", { companyId })),
    saveModuleAccess: (payload) => apiPut("/module-access", payload),
  },
};
