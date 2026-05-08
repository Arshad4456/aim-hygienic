import { apiDelete, apiGet, apiPost, apiPut, withQuery } from "./apiClient";

export const financeService = {
  overview: (params = {}) => apiGet(withQuery("/finance/overview", params)),
  ledgerSummary: (params = {}) => apiGet(withQuery("/finance/ledger-summary", params)),
  reports: (params = {}) => apiGet(withQuery("/finance/reports", params)),
  trialBalance: (params = {}) => apiGet(withQuery("/finance/trial-balance", params)),
  profitLoss: (params = {}) => apiGet(withQuery("/finance/profit-loss", params)),
  balanceSheet: (params = {}) => apiGet(withQuery("/finance/balance-sheet", params)),
  aging: (params = {}) => apiGet(withQuery("/finance/aging", params)),
  cashbook: (params = {}) => apiGet(withQuery("/finance/cashbook", params)),

  listChartAccounts: (params = {}) => apiGet(withQuery("/finance/chart-of-accounts", params)),
  createChartAccount: (payload) => apiPost("/finance/chart-of-accounts", payload),
  updateChartAccount: (id, payload) => apiPut(`/finance/chart-of-accounts/${encodeURIComponent(id)}`, payload),
  deleteChartAccount: (id) => apiDelete(`/finance/chart-of-accounts/${encodeURIComponent(id)}`),

  listJournalEntries: (params = {}) => apiGet(withQuery("/finance/journal-entries", params)),
  createJournalEntry: (payload) => apiPost("/finance/journal-entries", payload),
  postJournalEntry: (id) => apiPost(`/finance/journal-entries/${encodeURIComponent(id)}/post`, {}),
  reverseJournalEntry: (id) => apiPost(`/finance/journal-entries/${encodeURIComponent(id)}/reverse`, {}),

  listAccounts: () => apiGet("/finance/accounts"),
  createAccount: (payload) => apiPost("/finance/accounts", payload),
  listTransactions: (params = {}) => apiGet(withQuery("/finance/transactions", params)),
  createTransaction: (payload) => apiPost("/finance/transactions", payload),
  listExpenses: (params = {}) => apiGet(withQuery("/finance/expenses", params)),
  listLoans: (params = {}) => apiGet(withQuery("/finance/loans", params)),

  receiveDistributorInvoice: (invoiceId, payload) => apiPost(`/finance/distributor-invoices/${encodeURIComponent(invoiceId)}/receive`, payload),
  receiveCustomerInvoice: (invoiceId, payload) => apiPost(`/finance/customer-invoices/${encodeURIComponent(invoiceId)}/receive`, payload),
  paySupplierInvoice: (invoiceId, payload) => apiPost(`/finance/supplier-invoices/${encodeURIComponent(invoiceId)}/pay`, payload),
};

export const overview = financeService.overview;
export const ledgerSummary = financeService.ledgerSummary;
export const listAccounts = financeService.listAccounts;
export const createAccount = financeService.createAccount;
export const listTransactions = financeService.listTransactions;
export const listExpenses = financeService.listExpenses;
export const listLoans = financeService.listLoans;
export const receiveDistributorInvoice = financeService.receiveDistributorInvoice;
export const receiveCustomerInvoice = financeService.receiveCustomerInvoice;
export const paySupplierInvoice = financeService.paySupplierInvoice;

export default financeService;
