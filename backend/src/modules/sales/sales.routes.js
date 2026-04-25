const express = require("express");
const { requireAuth } = require("../../utils/auth");
const controller = require("./sales.controller");

const router = express.Router();
router.use(requireAuth);

router.get("/overview", controller.overview);
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
router.get("/primary/invoices", controller.invoices);
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
router.get("/secondary/invoices", controller.customerInvoices);
router.get("/secondary/receipts", controller.customerReceipts);
router.post("/secondary/invoices/:id/pay", controller.payCustomerInvoice);

// Canonical aliases for phase 7 secondary sales.
router.get("/secondary-orders", controller.secondaryOrders);
router.post("/secondary-orders", controller.createSecondaryOrder);
router.post("/secondary-orders/:id/approve", controller.approveSecondaryOrder);
router.post("/secondary-orders/:id/fulfill", controller.fulfillSecondaryOrder);

module.exports = router;
