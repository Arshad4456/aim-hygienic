const Supplier = require("../../models/Supplier");
const User = require("../../models/User");
const PurchaseOrder = require("../../models/PurchaseOrder");
const GoodsReceipt = require("../../models/GoodsReceipt");
const SupplierInvoice = require("../../models/SupplierInvoice");
const SupplierPayment = require("../../models/SupplierPayment");
const { asText, getScopedModels } = require("../../services/scopedModels");

function companyIdFrom(req) { return asText(req.query.companyId || req.body?.companyId || req.user?.companyId); }
function uidFrom(req) { return asText(req.user?.uid || req.user?._id || req.user?.userId); }
function makeDocNo(prefix) { return `${prefix}-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Date.now().toString().slice(-6)}`; }
function toMoney(value) { return Math.round(Number(value || 0) * 100) / 100; }
function normalizeLines(lines = []) {
  return Array.isArray(lines) ? lines.map((line, index) => {
    const qty = Number(line.qty || line.quantity || 0);
    const unitCost = Number(line.unitCost || line.cost || 0);
    const discountValue = Number(line.discountValue || 0);
    const taxPercent = Number(line.taxPercent || 0);
    const gross = qty * unitCost;
    const taxValue = ((gross - discountValue) * taxPercent) / 100;
    return {
      ...line,
      lineNo: Number(line.lineNo || index + 1),
      productName: asText(line.productName || line.name || "Procurement item"),
      qty,
      unitCost,
      taxValue: toMoney(line.taxValue ?? taxValue),
      netLineAmount: toMoney(line.netLineAmount ?? gross - discountValue + taxValue),
    };
  }) : [];
}
function calculateTotals(lines = [], supplied = {}) {
  const subtotal = lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.unitCost || 0), 0);
  const discountTotal = lines.reduce((sum, line) => sum + Number(line.discountValue || 0), 0);
  const taxTotal = lines.reduce((sum, line) => sum + Number(line.taxValue || 0), 0);
  const freightTotal = Number(supplied.freightTotal || 0);
  const otherChargesTotal = Number(supplied.otherChargesTotal || 0);
  return {
    subtotal: toMoney(supplied.subtotal ?? subtotal),
    discountTotal: toMoney(supplied.discountTotal ?? discountTotal),
    taxTotal: toMoney(supplied.taxTotal ?? taxTotal),
    freightTotal: toMoney(freightTotal),
    otherChargesTotal: toMoney(otherChargesTotal),
    grandTotal: toMoney(supplied.grandTotal ?? subtotal - discountTotal + taxTotal + freightTotal + otherChargesTotal),
  };
}
function supplierSnapshot(source = {}) {
  return {
    partyType: "supplier",
    partyId: asText(source._id || source.id || source.partyId || source.supplierId || source.linkedUserId),
    partyCode: asText(source.supplierCode || source.partyCode || source.code),
    partyName: asText(source.supplierName || source.partyName || source.fullName || source.username || source.name || "Supplier"),
    contactName: asText(source.contactName || source.contact || source.fullName),
    mobile: asText(source.phone || source.mobile || source.mobileNumber),
    address: asText(source.address),
  };
}
async function scoped(req) {
  return getScopedModels(req, { SupplierModel: Supplier, PurchaseOrderModel: PurchaseOrder, GoodsReceiptModel: GoodsReceipt, SupplierInvoiceModel: SupplierInvoice, SupplierPaymentModel: SupplierPayment, UserModel: User });
}
async function listSuppliers(req) {
  const { SupplierModel, UserModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const filter = { companyId };
  if (req.query.status && req.query.status !== "all") filter.status = asText(req.query.status);
  const supplierDocs = await SupplierModel.find(filter).sort({ supplierName: 1 }).lean();
  const legacyUsers = await UserModel.find({ companyId, role: /supplier/i }).select("_id username fullName email mobile mobileNumber status supplierWarehouseName1 supplierWarehouseName2").lean().catch(() => []);
  const mappedLegacy = legacyUsers.map((user) => ({
    _id: user._id,
    linkedUserId: String(user._id),
    supplierName: user.fullName || user.username,
    contactName: user.fullName || user.username,
    email: user.email,
    phone: user.mobile || user.mobileNumber,
    status: user.status || "active",
    source: "legacy_user",
    supplierWarehouseName1: user.supplierWarehouseName1,
    supplierWarehouseName2: user.supplierWarehouseName2,
  }));
  const existingLinked = new Set(supplierDocs.map((s) => String(s.linkedUserId || "")));
  return [...supplierDocs.map((s) => ({ ...s, source: "supplier_master" })), ...mappedLegacy.filter((u) => !existingLinked.has(String(u.linkedUserId || u._id)))];
}
async function createSupplier(req) {
  const { SupplierModel } = await scoped(req);
  const body = req.body || {};
  const companyId = companyIdFrom(req);
  const doc = await SupplierModel.create({
    companyId,
    supplierCode: asText(body.supplierCode || `SUP-${Date.now().toString().slice(-5)}`),
    supplierName: asText(body.supplierName || body.name),
    contactName: asText(body.contactName),
    phone: asText(body.phone || body.mobile),
    email: asText(body.email),
    address: asText(body.address),
    city: asText(body.city),
    taxNo: asText(body.taxNo),
    paymentTermsDays: Number(body.paymentTermsDays || 0),
    creditLimit: Number(body.creditLimit || 0),
    openingBalance: Number(body.openingBalance || 0),
    currentBalance: Number(body.currentBalance ?? body.openingBalance ?? 0),
    linkedUserId: asText(body.linkedUserId),
    status: ["active", "inactive", "blocked"].includes(body.status) ? body.status : "active",
    notes: asText(body.notes),
    createdByUserId: uidFrom(req),
  });
  return doc;
}
async function listPurchaseOrders(req) {
  const { PurchaseOrderModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.status && req.query.status !== "all") filter.status = asText(req.query.status);
  if (req.query.supplierId) filter["supplier.partyId"] = asText(req.query.supplierId);
  return PurchaseOrderModel.find(filter).sort({ createdAt: -1 }).lean();
}
async function createPurchaseOrder(req) {
  const { PurchaseOrderModel } = await scoped(req);
  const body = req.body || {};
  const companyId = companyIdFrom(req);
  const lines = normalizeLines(body.lines);
  const totals = calculateTotals(lines, body.totals || {});
  const doc = await PurchaseOrderModel.create({
    companyId,
    documentNo: asText(body.documentNo || makeDocNo("PO")),
    supplier: supplierSnapshot(body.supplier || body),
    expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
    orderDate: body.orderDate ? new Date(body.orderDate) : new Date(),
    warehouse: body.warehouse || null,
    status: asText(body.status || "pending_approval"),
    lines,
    totals,
    balanceAmount: totals.grandTotal,
    notes: asText(body.notes),
    createdByUserId: uidFrom(req),
    statusHistory: [{ status: asText(body.status || "pending_approval"), changedBy: uidFrom(req), note: "Purchase order created" }],
  });
  return doc;
}
async function approvePurchaseOrder(req) {
  const { PurchaseOrderModel } = await scoped(req);
  const doc = await PurchaseOrderModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!doc) throw new Error("Purchase order not found");
  doc.status = "approved";
  doc.approvedByUserId = uidFrom(req);
  doc.approvedAt = new Date();
  doc.statusHistory.push({ status: "approved", changedBy: uidFrom(req), note: "Approved" });
  return doc.save();
}
async function receivePurchaseOrder(req) {
  const { PurchaseOrderModel, GoodsReceiptModel } = await scoped(req);
  const po = await PurchaseOrderModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!po) throw new Error("Purchase order not found");
  const body = req.body || {};
  const lines = normalizeLines(body.lines?.length ? body.lines : po.lines).map((line) => ({ ...line, receivedQty: Number(line.receivedQty || line.qty || 0) }));
  const totals = calculateTotals(lines, body.totals || po.totals || {});
  const receipt = await GoodsReceiptModel.create({
    companyId: po.companyId,
    companyName: req.user?.companyName,
    documentNo: asText(body.documentNo || makeDocNo("GRN")),
    ownerType: "company",
    ownerId: po.companyId,
    purchaseOrderId: po._id,
    purchaseOrderNo: po.documentNo,
    supplier: po.supplier,
    receivedAtWarehouse: body.warehouse || po.warehouse || null,
    status: "draft",
    receivedAt: new Date(),
    lines,
    totals,
    createdByUserId: uidFrom(req),
    notes: asText(body.notes || `Received against ${po.documentNo}`),
    statusHistory: [{ status: "draft", changedBy: uidFrom(req), note: "GRN created from purchase order" }],
  });
  const receivedTotal = Number(po.receivedTotal || 0) + Number(totals.grandTotal || 0);
  po.receivedTotal = receivedTotal;
  po.status = receivedTotal >= Number(po.totals?.grandTotal || 0) ? "received" : "partially_received";
  po.statusHistory.push({ status: po.status, changedBy: uidFrom(req), note: `GRN ${receipt.documentNo} created` });
  await po.save();
  return { purchaseOrder: po, goodsReceipt: receipt };
}
async function listGoodsReceipts(req) {
  const { GoodsReceiptModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.status && req.query.status !== "all") filter.status = asText(req.query.status);
  return GoodsReceiptModel.find(filter).sort({ createdAt: -1 }).lean();
}
async function overview(req) {
  const { PurchaseOrderModel, GoodsReceiptModel, SupplierInvoiceModel, SupplierPaymentModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const [suppliers, purchaseOrders, openOrders, receipts, invoices, payments] = await Promise.all([
    listSuppliers(req),
    PurchaseOrderModel.countDocuments({ companyId }),
    PurchaseOrderModel.countDocuments({ companyId, status: { $in: ["draft", "pending_approval", "approved", "partially_received"] } }),
    GoodsReceiptModel.countDocuments({ companyId }),
    SupplierInvoiceModel.find({ companyId }).select("invoiceTotal balanceAmount paymentStatus").lean().catch(() => []),
    SupplierPaymentModel.find({ companyId }).select("amount status").lean().catch(() => []),
  ]);
  const invoiceTotal = invoices.reduce((sum, row) => sum + Number(row.invoiceTotal || 0), 0);
  const payableBalance = invoices.reduce((sum, row) => sum + Number(row.balanceAmount || 0), 0);
  const paidTotal = payments.filter((p) => ["approved", "posted"].includes(String(p.status))).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return { ok: true, kpis: { suppliers: suppliers.length, purchaseOrders, openOrders, goodsReceipts: receipts, invoiceTotal, payableBalance, paidTotal } };
}
async function listSupplierInvoices(req) { const { SupplierInvoiceModel } = await scoped(req); return SupplierInvoiceModel.find({ companyId: companyIdFrom(req) }).sort({ createdAt: -1 }).lean(); }
async function listSupplierPayments(req) { const { SupplierPaymentModel } = await scoped(req); return SupplierPaymentModel.find({ companyId: companyIdFrom(req) }).sort({ createdAt: -1 }).lean(); }

module.exports = { overview, listSuppliers, createSupplier, listPurchaseOrders, createPurchaseOrder, approvePurchaseOrder, receivePurchaseOrder, listGoodsReceipts, listSupplierInvoices, listSupplierPayments };
