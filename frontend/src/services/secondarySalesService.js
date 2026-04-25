import apiClient from "./apiClient";

const secondarySalesService = {
  overview: () => apiClient("/sales/secondary/overview"),
  customers: () => apiClient("/sales/secondary/customers"),
  products: () => apiClient("/sales/secondary/products"),
  orders: () => apiClient("/sales/secondary/orders"),
  createOrder: (payload) => apiClient("/sales/secondary/orders", { method: "POST", body: JSON.stringify(payload) }),
  approveOrder: (id) => apiClient(`/sales/secondary/orders/${id}/approve`, { method: "POST" }),
  fulfillOrder: (id, payload = {}) => apiClient(`/sales/secondary/orders/${id}/fulfill`, { method: "POST", body: JSON.stringify(payload) }),
  invoices: () => apiClient("/sales/secondary/invoices"),
  receipts: () => apiClient("/sales/secondary/receipts"),
  payInvoice: (id, payload = {}) => apiClient(`/sales/secondary/invoices/${id}/pay`, { method: "POST", body: JSON.stringify(payload) }),
};

export default secondarySalesService;
