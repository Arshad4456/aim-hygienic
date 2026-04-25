import apiClient from "./apiClient";

const primarySalesService = {
  overview: () => apiClient("/sales/primary/overview"),
  distributors: () => apiClient("/sales/primary/distributors"),
  products: () => apiClient("/sales/primary/products"),
  warehouses: () => apiClient("/sales/primary/warehouses"),
  orders: () => apiClient("/sales/primary/orders"),
  createOrder: (payload) => apiClient("/sales/primary/orders", { method: "POST", body: JSON.stringify(payload) }),
  approveOrder: (id) => apiClient(`/sales/primary/orders/${id}/approve`, { method: "POST" }),
  createDispatch: (id) => apiClient(`/sales/primary/orders/${id}/dispatch`, { method: "POST" }),
  dispatches: () => apiClient("/sales/primary/dispatches"),
  postDispatch: (id) => apiClient(`/sales/primary/dispatches/${id}/post`, { method: "POST" }),
  invoices: () => apiClient("/sales/primary/invoices"),
  stockReceipts: () => apiClient("/sales/primary/stock-receipts"),
  postStockReceipt: (id) => apiClient(`/sales/primary/stock-receipts/${id}/post`, { method: "POST" }),
};

export default primarySalesService;
