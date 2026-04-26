import apiClient from "./apiClient";

function query(params = {}) {
  const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""));
  return search.toString() ? `?${search}` : "";
}

const secondarySalesService = {
  overview: (params = {}) => apiClient(`/sales/secondary/overview${query(params)}`),
  distributors: () => apiClient("/sales/primary/distributors"),
  customers: () => apiClient("/sales/secondary/customers"),
  products: (params = {}) => apiClient(`/sales/secondary/products${query(params)}`),
  orders: (params = {}) => apiClient(`/sales/secondary/orders${query(params)}`),
  createOrder: (payload) => apiClient("/sales/secondary/orders", { method: "POST", body: JSON.stringify(payload) }),
  approveOrder: (id) => apiClient(`/sales/secondary/orders/${id}/approve`, { method: "POST" }),
  fulfillOrder: (id, payload = {}) => apiClient(`/sales/secondary/orders/${id}/fulfill`, { method: "POST", body: JSON.stringify(payload) }),
  invoices: (params = {}) => apiClient(`/sales/secondary/invoices${query(params)}`),
  receipts: (params = {}) => apiClient(`/sales/secondary/receipts${query(params)}`),
  payInvoice: (id, payload = {}) => apiClient(`/sales/secondary/invoices/${id}/pay`, { method: "POST", body: JSON.stringify(payload) }),
};

export default secondarySalesService;
