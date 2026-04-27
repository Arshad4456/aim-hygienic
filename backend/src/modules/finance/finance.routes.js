const express = require("express");
const { requireAuth } = require("../../utils/auth");
const controller = require("./finance.controller");

const router = express.Router();
router.use(requireAuth);

router.get("/overview", controller.overview);
router.get("/ledger-summary", controller.ledgerSummary);
router.get("/accounts", controller.accounts);
router.post("/accounts", controller.createAccount);
router.get("/transactions", controller.transactions);
router.get("/expenses", controller.expenses);
router.get("/loans", controller.loans);

router.get("/distributor-invoices", controller.distributorInvoices);
router.get("/distributor-receipts", controller.distributorReceipts);
router.post("/distributor-invoices/:id/receive", controller.receiveDistributorInvoice);

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
