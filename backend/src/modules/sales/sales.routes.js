const express = require("express");
const { requireAuth } = require("../../utils/auth");
const controller = require("./sales.controller");

const router = express.Router();
router.use(requireAuth);

router.get("/overview", controller.overview);
router.get("/distribution/overview", controller.distributionOverview);
router.get("/distribution/statement", controller.distributorStatement);
router.get("/distribution/statement/:distributorId", controller.distributorStatement);
router.get("/print/:type/:id", controller.printDocument);
router.get("/quotations", controller.quotations);
router.post("/quotations", controller.createQuotation);
router.post("/quotations/:id/approve", controller.approveQuotation);
router.post("/quotations/:id/convert", controller.convertQuotation);
router.get("/primary/overview", controller.overview);
router.get("/primary/distributors", controller.distributors);
router.get("/primary/products", controller.products);
router.get("/primary/warehouses", controller.warehouses);
router.get("/primary/orders", controller.primaryOrders);
router.post("/primary/orders", controller.createPrimaryOrder);
router.post("/primary/orders/:id/approve", controller.approvePrimaryOrder);
router.post("/primary/orders/:id/dispatch", controller.createDispatch);
router.get("/primary/dispatches", controller.dispatches);
router.post("/primary/dispatches/:id/post", controller.postDispatch);
router.post("/primary/dispatches/:id/pod", controller.attachDispatchPod);
router.get("/primary/invoices", controller.invoices);
router.post("/primary/invoices/:id/pay", controller.payDistributorInvoice);
router.get("/primary/receipts", controller.companyReceipts);
router.get("/primary/stock-receipts", controller.distributorReceipts);
router.post("/primary/stock-receipts/:id/post", controller.postDistributorReceipt);

// Canonical aliases used by the portal route registry.
router.get("/primary-orders", controller.primaryOrders);
router.post("/primary-orders", controller.createPrimaryOrder);
router.post("/primary-orders/:id/approve", controller.approvePrimaryOrder);
router.post("/primary-orders/:id/dispatch", controller.createDispatch);

router.get("/secondary/overview", controller.secondaryOverview);
router.get("/secondary/customers", controller.customers);
router.get("/secondary/products", controller.distributorProducts);
router.get("/secondary/orders", controller.secondaryOrders);
router.post("/secondary/orders", controller.createSecondaryOrder);
router.post("/secondary/orders/:id/approve", controller.approveSecondaryOrder);
router.post("/secondary/orders/:id/fulfill", controller.fulfillSecondaryOrder);
router.post("/secondary/orders/:id/pod", controller.attachSecondaryPod);
router.get("/secondary/invoices", controller.customerInvoices);
router.get("/secondary/receipts", controller.customerReceipts);
router.post("/secondary/invoices/:id/pay", controller.payCustomerInvoice);

// Canonical aliases for phase 7 secondary sales.
router.get("/secondary-orders", controller.secondaryOrders);
router.post("/secondary-orders", controller.createSecondaryOrder);
router.post("/secondary-orders/:id/approve", controller.approveSecondaryOrder);
router.post("/secondary-orders/:id/fulfill", controller.fulfillSecondaryOrder);
router.post("/secondary-orders/:id/pod", controller.attachSecondaryPod);

module.exports = router;
