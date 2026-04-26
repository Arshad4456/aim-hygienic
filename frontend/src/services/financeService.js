import apiClient from "./apiClient";

const financeService = {
  overview: () => apiClient("/finance/overview"),
  accounts: () => apiClient("/finance/accounts"),
  transactions: () => apiClient("/finance/transactions"),
  distributorInvoices: () => apiClient("/finance/distributor-invoices"),
  distributorReceipts: () => apiClient("/finance/distributor-receipts"),
  receiveDistributorInvoice: (id, payload = {}) => apiClient(`/finance/distributor-invoices/${id}/receive`, { method: "POST", body: JSON.stringify(payload) }),
  customerInvoices: () => apiClient("/finance/customer-invoices"),
  customerReceipts: () => apiClient("/finance/customer-receipts"),
  receiveCustomerInvoice: (id, payload = {}) => apiClient(`/sales/secondary/invoices/${id}/pay`, { method: "POST", body: JSON.stringify(payload) }),
  supplierInvoices: () => apiClient("/finance/supplier-invoices"),
  supplierPayments: () => apiClient("/finance/supplier-payments"),
  paySupplierInvoice: (id, payload = {}) => apiClient(`/finance/supplier-invoices/${id}/pay`, { method: "POST", body: JSON.stringify(payload) }),
};

export default financeService;
