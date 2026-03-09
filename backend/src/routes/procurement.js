const express = require("express");
const { requireAuth } = require("../utils/auth");
const ProcurementSupplier = require("../models/ProcurementSupplier");
const PurchaseOrder = require("../models/PurchaseOrder");
const GoodsReceipt = require("../models/GoodsReceipt");
const SupplierPayment = require("../models/SupplierPayment");
const InventoryMovement = require("../models/InventoryMovement");

const router = express.Router();

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function nextCode(prefix, model, field) {
  const lastRow = await model.findOne({}, { [field]: 1 }).sort({ createdAt: -1 }).lean();
  const lastCode = String(lastRow?.[field] || "");
  const match = lastCode.match(/(\d+)$/);
  const next = (match ? Number(match[1]) : 0) + 1;
  return `${prefix}-${String(next).padStart(5, "0")}`;
}

router.get("/summary", requireAuth, async (_req, res) => {
  try {
    const [suppliers, purchaseOrders, receipts, payments] = await Promise.all([
      ProcurementSupplier.find().sort({ createdAt: -1 }).limit(10).lean(),
      PurchaseOrder.find().sort({ createdAt: -1 }).limit(10).lean(),
      GoodsReceipt.find().sort({ createdAt: -1 }).limit(20).lean(),
      SupplierPayment.find().sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    const [supplierCount, activeSuppliers, poCount, pendingPayments] = await Promise.all([
      ProcurementSupplier.countDocuments(),
      ProcurementSupplier.countDocuments({ status: "active" }),
      PurchaseOrder.countDocuments(),
      SupplierPayment.countDocuments({ status: { $in: ["pending", "overdue", "partial"] } }),
    ]);

    const totalQtyReceived = receipts.reduce((sum, row) => sum + toNumber(row.totalReceivedQty), 0);
    const totalPaymentAmount = payments.reduce((sum, row) => sum + toNumber(row.amount), 0);

    return res.json({
      ok: true,
      kpis: {
        totalSuppliers: supplierCount,
        activeSuppliers,
        totalPurchaseOrders: poCount,
        totalReceipts: receipts.length,
        totalQuantity: totalQtyReceived,
        pendingPayments,
        paymentAmount: totalPaymentAmount,
      },
      suppliers,
      purchaseOrders,
      recentPurchases: receipts,
      payments,
    });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load procurement summary" });
  }
});

router.get("/suppliers", requireAuth, async (_req, res) => {
  const suppliers = await ProcurementSupplier.find().sort({ createdAt: -1 }).lean();
  res.json({ ok: true, suppliers });
});

router.post("/suppliers", requireAuth, async (req, res) => {
  try {
    const code = req.body.supplierCode || (await nextCode("SUP", ProcurementSupplier, "supplierCode"));
    const supplier = await ProcurementSupplier.create({
      supplierCode: code,
      name: String(req.body.name || "").trim(),
      contactPerson: req.body.contactPerson,
      phone: req.body.phone,
      email: req.body.email,
      taxId: req.body.taxId,
      address: req.body.address,
      paymentTerms: req.body.paymentTerms || "Net 30",
      leadTimeDays: toNumber(req.body.leadTimeDays, 7),
      rating: toNumber(req.body.rating, 3),
      status: req.body.status || "active",
      createdBy: req.user?.uid,
    });

    res.status(201).json({ ok: true, supplier });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message || "Failed to create supplier" });
  }
});

router.get("/purchase-orders", requireAuth, async (_req, res) => {
  const purchaseOrders = await PurchaseOrder.find().sort({ createdAt: -1 }).lean();
  res.json({ ok: true, purchaseOrders });
});

router.post("/purchase-orders", requireAuth, async (req, res) => {
  try {
    const supplier = await ProcurementSupplier.findById(req.body.supplierId).lean();
    if (!supplier) return res.status(404).json({ ok: false, message: "Supplier not found" });

    const items = Array.isArray(req.body.items)
      ? req.body.items.map((item) => {
          const quantity = toNumber(item.quantity);
          const unitPrice = toNumber(item.unitPrice);
          const taxPercent = toNumber(item.taxPercent);
          const lineTotal = quantity * unitPrice + (quantity * unitPrice * taxPercent) / 100;
          return {
            productId: item.productId,
            productName: String(item.productName || "").trim(),
            quantity,
            unitPrice,
            taxPercent,
            lineTotal,
          };
        })
      : [];

    const subtotal = items.reduce((sum, row) => sum + toNumber(row.quantity) * toNumber(row.unitPrice), 0);
    const taxAmount = items.reduce((sum, row) => sum + toNumber(row.lineTotal) - toNumber(row.quantity) * toNumber(row.unitPrice), 0);
    const discountAmount = toNumber(req.body.discountAmount);
    const totalAmount = subtotal + taxAmount - discountAmount;

    const poNumber = req.body.poNumber || (await nextCode("PO", PurchaseOrder, "poNumber"));

    const purchaseOrder = await PurchaseOrder.create({
      poNumber,
      supplierId: supplier._id,
      supplierName: supplier.name,
      orderDate: req.body.orderDate || new Date(),
      expectedDeliveryDate: req.body.expectedDeliveryDate,
      currency: req.body.currency || "PKR",
      status: req.body.status || "approved",
      items,
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      notes: req.body.notes,
      createdBy: req.user?.uid,
    });

    await ProcurementSupplier.updateOne({ _id: supplier._id }, { $set: { lastOrderAt: new Date() } });

    res.status(201).json({ ok: true, purchaseOrder });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message || "Failed to create purchase order" });
  }
});

router.get("/grn", requireAuth, async (_req, res) => {
  const receipts = await GoodsReceipt.find().sort({ createdAt: -1 }).lean();
  res.json({ ok: true, receipts });
});

router.post("/grn", requireAuth, async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.body.purchaseOrderId).lean();
    if (!purchaseOrder) return res.status(404).json({ ok: false, message: "Purchase order not found" });

    const items = Array.isArray(req.body.items)
      ? req.body.items.map((item) => ({
          productId: item.productId,
          productName: String(item.productName || "").trim(),
          warehouseId: String(item.warehouseId || "").trim(),
          warehouseName: item.warehouseName,
          quantityReceived: toNumber(item.quantityReceived),
          acceptedQuantity: toNumber(item.acceptedQuantity, toNumber(item.quantityReceived)),
          rejectedQuantity: toNumber(item.rejectedQuantity, 0),
          unitCost: toNumber(item.unitCost),
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
        }))
      : [];

    const totalReceivedQty = items.reduce((sum, row) => sum + toNumber(row.quantityReceived), 0);
    const grnNumber = req.body.grnNumber || (await nextCode("GRN", GoodsReceipt, "grnNumber"));

    const receipt = await GoodsReceipt.create({
      grnNumber,
      purchaseOrderId: purchaseOrder._id,
      poNumber: purchaseOrder.poNumber,
      supplierId: purchaseOrder.supplierId,
      supplierName: purchaseOrder.supplierName,
      receivedDate: req.body.receivedDate || new Date(),
      qcStatus: req.body.qcStatus || "pending",
      status: req.body.status || "posted",
      items,
      totalReceivedQty,
      notes: req.body.notes,
      createdBy: req.user?.uid,
    });

    await Promise.all(
      items.map((item) =>
        InventoryMovement.create({
          productId: item.productId || item.productName,
          productName: item.productName,
          warehouseId: item.warehouseId,
          warehouseName: item.warehouseName,
          quantity: item.quantityReceived,
          movementType: "PURCHASE_IN",
          referenceId: grnNumber,
          createdBy: req.user?.uid,
        })
      )
    );

    await PurchaseOrder.updateOne(
      { _id: purchaseOrder._id },
      { $set: { status: req.body.closePo ? "received" : "partially_received" } }
    );

    res.status(201).json({ ok: true, receipt });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message || "Failed to create goods receipt" });
  }
});

router.get("/payments", requireAuth, async (_req, res) => {
  const payments = await SupplierPayment.find().sort({ createdAt: -1 }).lean();
  res.json({ ok: true, payments });
});

router.post("/payments", requireAuth, async (req, res) => {
  try {
    const supplier = await ProcurementSupplier.findById(req.body.supplierId).lean();
    if (!supplier) return res.status(404).json({ ok: false, message: "Supplier not found" });

    const paymentNumber = req.body.paymentNumber || (await nextCode("PAY", SupplierPayment, "paymentNumber"));

    const payment = await SupplierPayment.create({
      paymentNumber,
      supplierId: supplier._id,
      supplierName: supplier.name,
      purchaseOrderId: req.body.purchaseOrderId || undefined,
      poNumber: req.body.poNumber,
      grnNumber: req.body.grnNumber,
      amount: toNumber(req.body.amount),
      currency: req.body.currency || "PKR",
      method: req.body.method || "bank_transfer",
      status: req.body.status || "pending",
      dueDate: req.body.dueDate,
      paidDate: req.body.paidDate,
      reference: req.body.reference,
      notes: req.body.notes,
      createdBy: req.user?.uid,
    });

    res.status(201).json({ ok: true, payment });
  } catch (error) {
    res.status(400).json({ ok: false, message: error.message || "Failed to create supplier payment" });
  }
});

module.exports = router;
