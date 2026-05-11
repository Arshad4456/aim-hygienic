import apiClient from "@/src/app/infrastructure/api/apiClient";

function query(params = {}) {
  const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));
  return search.toString() ? `?${search}` : "";
}

const primarySalesService = {
  overview: () => apiClient("/sales/primary/overview"),
  distributionOverview: () => apiClient("/sales/distribution/overview"),
  distributorStatement: (distributorId) => apiClient(`/sales/distribution/statement/${distributorId}`),
  quotations: (params = {}) => apiClient(`/sales/quotations${query(params)}`),
  createQuotation: (payload) => apiClient("/sales/quotations", { method: "POST", body: JSON.stringify(payload) }),
  approveQuotation: (id) => apiClient(`/sales/quotations/${id}/approve`, { method: "POST" }),
  convertQuotation: (id, payload = {}) => apiClient(`/sales/quotations/${id}/convert`, { method: "POST", body: JSON.stringify(payload) }),
  distributors: () => apiClient("/sales/primary/distributors"),
  products: () => apiClient("/sales/primary/products"),
  warehouses: () => apiClient("/sales/primary/warehouses"),
  orders: () => apiClient("/sales/primary/orders"),
  createOrder: (payload) => apiClient("/sales/primary/orders", { method: "POST", body: JSON.stringify(payload) }),
  approveOrder: (id) => apiClient(`/sales/primary/orders/${id}/approve`, { method: "POST" }),
  createDispatch: (id, payload = {}) => apiClient(`/sales/primary/orders/${id}/dispatch`, { method: "POST", body: JSON.stringify(payload) }),
  dispatches: () => apiClient("/sales/primary/dispatches"),
  postDispatch: (id) => apiClient(`/sales/primary/dispatches/${id}/post`, { method: "POST" }),
  attachDispatchPod: (id, payload = {}) => apiClient(`/sales/primary/dispatches/${id}/pod`, { method: "POST", body: JSON.stringify(payload) }),
  invoices: () => apiClient("/sales/primary/invoices"),
  payInvoice: (id, payload = {}) => apiClient(`/sales/primary/invoices/${id}/pay`, { method: "POST", body: JSON.stringify(payload) }),
  receipts: () => apiClient("/sales/primary/receipts"),
  stockReceipts: () => apiClient("/sales/primary/stock-receipts"),
  postStockReceipt: (id) => apiClient(`/sales/primary/stock-receipts/${id}/post`, { method: "POST" }),
  printDocument: (type, id) => apiClient(`/sales/print/${type}/${id}`),
};

export default primarySalesService;
