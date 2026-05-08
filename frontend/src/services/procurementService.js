import apiClient from "./apiClient";

const procurementService = {
  overview: () => apiClient("/procurement/overview"),
  suppliers: () => apiClient("/procurement/suppliers"),
  products: () => apiClient("/procurement/products"),
  warehouses: () => apiClient("/procurement/warehouses"),
  createSupplier: (payload) => apiClient("/procurement/suppliers", { method: "POST", body: JSON.stringify(payload) }),
  updateSupplier: (id, payload) => apiClient(`/procurement/suppliers/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteSupplier: (id) => apiClient(`/procurement/suppliers/${id}`, { method: "DELETE" }),
  purchaseRequests: () => apiClient("/procurement/purchase-requests"),
  createPurchaseRequest: (payload) => apiClient("/procurement/purchase-requests", { method: "POST", body: JSON.stringify(payload) }),
  approvePurchaseRequest: (id) => apiClient(`/procurement/purchase-requests/${id}/approve`, { method: "POST" }),
  convertPurchaseRequest: (id, payload = {}) => apiClient(`/procurement/purchase-requests/${id}/convert`, { method: "POST", body: JSON.stringify(payload) }),
  purchaseOrders: () => apiClient("/procurement/purchase-orders"),
  createPurchaseOrder: (payload) => apiClient("/procurement/purchase-orders", { method: "POST", body: JSON.stringify(payload) }),
  approvePurchaseOrder: (id) => apiClient(`/procurement/purchase-orders/${id}/approve`, { method: "POST" }),
  receivePurchaseOrder: (id, payload = {}) => apiClient(`/procurement/purchase-orders/${id}/receive`, { method: "POST", body: JSON.stringify(payload) }),
  goodsReceipts: () => apiClient("/procurement/goods-receipts"),
  postGoodsReceipt: (id) => apiClient(`/procurement/goods-receipts/${id}/post`, { method: "POST" }),
  attachGoodsReceiptProof: (id, payload = {}) => apiClient(`/procurement/goods-receipts/${id}/proof`, { method: "POST", body: JSON.stringify(payload) }),
  supplierInvoices: () => apiClient("/procurement/supplier-invoices"),
  paySupplierInvoice: (id, payload = {}) => apiClient(`/procurement/supplier-invoices/${id}/pay`, { method: "POST", body: JSON.stringify(payload) }),
  supplierPayments: () => apiClient("/procurement/supplier-payments"),
  supplierStatement: (id) => apiClient(`/procurement/suppliers/${id}/statement`),
  printDocument: (type, id) => apiClient(`/procurement/print/${type}/${id}`),
};

export default procurementService;
