import apiClient from "./apiClient";

const procurementService = {
  overview: () => apiClient("/procurement/overview"),
  suppliers: () => apiClient("/procurement/suppliers"),
  products: () => apiClient("/procurement/products"),
  warehouses: () => apiClient("/procurement/warehouses"),
  createSupplier: (payload) => apiClient("/procurement/suppliers", { method: "POST", body: JSON.stringify(payload) }),
  purchaseOrders: () => apiClient("/procurement/purchase-orders"),
  createPurchaseOrder: (payload) => apiClient("/procurement/purchase-orders", { method: "POST", body: JSON.stringify(payload) }),
  approvePurchaseOrder: (id) => apiClient(`/procurement/purchase-orders/${id}/approve`, { method: "POST" }),
  receivePurchaseOrder: (id, payload = {}) => apiClient(`/procurement/purchase-orders/${id}/receive`, { method: "POST", body: JSON.stringify(payload) }),
  goodsReceipts: () => apiClient("/procurement/goods-receipts"),
  postGoodsReceipt: (id) => apiClient(`/procurement/goods-receipts/${id}/post`, { method: "POST" }),
  supplierInvoices: () => apiClient("/procurement/supplier-invoices"),
  paySupplierInvoice: (id, payload = {}) => apiClient(`/procurement/supplier-invoices/${id}/pay`, { method: "POST", body: JSON.stringify(payload) }),
  supplierPayments: () => apiClient("/procurement/supplier-payments"),
};

export default procurementService;
