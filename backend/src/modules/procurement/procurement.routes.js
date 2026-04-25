const express = require("express");
const { requireAuth } = require("../../utils/auth");
const controller = require("./procurement.controller");
const router = express.Router();

router.get("/overview", requireAuth, controller.overview);
router.get("/suppliers", requireAuth, controller.suppliers);
router.post("/suppliers", requireAuth, controller.createSupplier);
router.get("/purchase-orders", requireAuth, controller.purchaseOrders);
router.post("/purchase-orders", requireAuth, controller.createPurchaseOrder);
router.post("/purchase-orders/:id/approve", requireAuth, controller.approvePurchaseOrder);
router.post("/purchase-orders/:id/receive", requireAuth, controller.receivePurchaseOrder);
router.get("/goods-receipts", requireAuth, controller.goodsReceipts);
router.post("/goods-receipts/:id/post", requireAuth, controller.postGoodsReceipt);
router.get("/supplier-invoices", requireAuth, controller.supplierInvoices);
router.post("/supplier-invoices/:id/pay", requireAuth, controller.paySupplierInvoice);
router.get("/supplier-payments", requireAuth, controller.supplierPayments);

module.exports = router;
