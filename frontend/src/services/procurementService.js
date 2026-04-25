import apiClient from "./apiClient";
function qs(params = {}) { const query = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")).toString(); return query ? `?${query}` : ""; }
export const procurementService = {
  overview: (params = {}) => apiClient(`/procurement/overview${qs(params)}`),
  suppliers: (params = {}) => apiClient(`/procurement/suppliers${qs(params)}`),
  createSupplier: (data) => apiClient("/procurement/suppliers", { method: "POST", body: JSON.stringify(data) }),
  purchaseOrders: (params = {}) => apiClient(`/procurement/purchase-orders${qs(params)}`),
  createPurchaseOrder: (data) => apiClient("/procurement/purchase-orders", { method: "POST", body: JSON.stringify(data) }),
  approvePurchaseOrder: (id) => apiClient(`/procurement/purchase-orders/${id}/approve`, { method: "POST", body: JSON.stringify({}) }),
  receivePurchaseOrder: (id, data = {}) => apiClient(`/procurement/purchase-orders/${id}/receive`, { method: "POST", body: JSON.stringify(data) }),
  goodsReceipts: (params = {}) => apiClient(`/procurement/goods-receipts${qs(params)}`),
  supplierInvoices: (params = {}) => apiClient(`/procurement/supplier-invoices${qs(params)}`),
  supplierPayments: (params = {}) => apiClient(`/procurement/supplier-payments${qs(params)}`),
};
export default procurementService;
