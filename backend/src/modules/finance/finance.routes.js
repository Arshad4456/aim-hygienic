const express = require("express");
const { requireAuth } = require("../../utils/auth");
const controller = require("./finance.controller");

const router = express.Router();
router.use(requireAuth);

router.get("/overview", controller.overview);
router.get("/ledger-summary", controller.ledgerSummary);

router.get("/chart-of-accounts", controller.chartAccounts);
router.post("/chart-of-accounts", controller.createChartAccount);
router.put("/chart-of-accounts/:id", controller.updateChartAccount);
router.delete("/chart-of-accounts/:id", controller.deleteChartAccount);

router.get("/journal-entries", controller.journalEntries);
router.post("/journal-entries", controller.createJournalEntry);
router.post("/journal-entries/:id/post", controller.postJournalEntry);
router.post("/journal-entries/:id/reverse", controller.reverseJournalEntry);

router.get("/reports", controller.reports);
router.get("/trial-balance", controller.trialBalance);
router.get("/profit-loss", controller.profitLoss);
router.get("/balance-sheet", controller.balanceSheet);
router.get("/aging", controller.aging);
router.get("/cashbook", controller.cashbook);

router.get("/accounts", controller.accounts);
router.post("/accounts", controller.createAccount);
router.get("/transactions", controller.transactions);
router.post("/transactions", controller.createTransaction);
router.get("/expenses", controller.expenses);
router.get("/loans", controller.loans);

router.get("/distributor-invoices", controller.distributorInvoices);
router.get("/distributor-receipts", controller.distributorReceipts);
router.post("/distributor-invoices/:id/receive", controller.receiveDistributorInvoice);
router.post("/customer-invoices/:id/receive", controller.receiveCustomerInvoice);

router.get("/customer-invoices", controller.customerInvoices);
router.get("/customer-receipts", controller.customerReceipts);

router.get("/supplier-invoices", controller.supplierInvoices);
router.get("/supplier-payments", controller.supplierPayments);
router.post("/supplier-invoices/:id/pay", controller.paySupplierInvoice);

router.get("/receivables", controller.distributorInvoices);
router.get("/receipts", controller.distributorReceipts);
router.get("/payables", controller.supplierInvoices);
router.get("/payments", controller.supplierPayments);

module.exports = router;
