import apiClient from "./apiClient";

function jsonOptions(method, payload) {
  return {
    method,
    body: JSON.stringify(payload || {}),
  };
}

export function overview(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiClient(`/finance/overview${query ? `?${query}` : ""}`);
}

export function ledgerSummary(params = {}) {
  const query = new URLSearchParams(params).toString();
  return apiClient(`/finance/ledger-summary${query ? `?${query}` : ""}`);
}

export function listAccounts() {
  return apiClient("/finance/accounts");
}

export function createAccount(payload) {
  return apiClient("/finance/accounts", jsonOptions("POST", payload));
}

export function listTransactions() {
  return apiClient("/finance/transactions");
}

export function listExpenses() {
  return apiClient("/finance/expenses");
}

export function listLoans() {
  return apiClient("/finance/loans");
}

export function receiveDistributorInvoice(invoiceId, payload) {
  return apiClient(`/finance/distributor-invoices/${encodeURIComponent(invoiceId)}/receive`, jsonOptions("POST", payload));
}

export function receiveCustomerInvoice(invoiceId, payload) {
  return apiClient(`/finance/customer-invoices/${encodeURIComponent(invoiceId)}/receive`, jsonOptions("POST", payload));
}

export function paySupplierInvoice(invoiceId, payload) {
  return apiClient(`/finance/supplier-invoices/${encodeURIComponent(invoiceId)}/pay`, jsonOptions("POST", payload));
}

const financeService = {
  overview,
  ledgerSummary,
  listAccounts,
  createAccount,
  listTransactions,
  listExpenses,
  listLoans,
  receiveDistributorInvoice,
  receiveCustomerInvoice,
  paySupplierInvoice,
};

export default financeService;
