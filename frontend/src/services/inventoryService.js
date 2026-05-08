import { apiGet, apiPost, withQuery } from "./apiClient";

const inventoryService = {
  overview: (params = {}) => apiGet(withQuery("/inventory/overview", params)),
  stockSummary: (params = {}) => apiGet(withQuery("/inventory/stock-summary", params)),
  warehouseStockSummary: (params = {}) => apiGet(withQuery("/inventory/warehouse-stock-summary", params)),
  ledger: (params = {}) => apiGet(withQuery("/inventory/ledger", params)),
  stockCard: (params = {}) => apiGet(withQuery("/inventory/stock-card", params)),
  lowStock: (params = {}) => apiGet(withQuery("/inventory/low-stock", params)),
  valuation: (params = {}) => apiGet(withQuery("/inventory/valuation", params)),
  batches: (params = {}) => apiGet(withQuery("/inventory/batches", params)),
  adjustments: (params = {}) => apiGet(withQuery("/inventory/adjustments", params)),
  createAdjustment: (payload) => apiPost("/inventory/adjustments", payload),
  transfers: (params = {}) => apiGet(withQuery("/inventory/transfers", params)),
  createTransfer: (payload) => apiPost("/inventory/transfers", payload),
  completeTransfer: (id, payload = {}) => apiPost(`/inventory/transfers/${encodeURIComponent(id)}/complete`, payload),
  warehouseOverview: () => apiGet("/warehouse/overview"),
};

export default inventoryService;
