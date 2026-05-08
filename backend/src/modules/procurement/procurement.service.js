const Supplier = require("../../models/Supplier");
const User = require("../../models/User");
const PurchaseOrder = require("../../models/PurchaseOrder");
const PurchaseRequest = require("../../models/PurchaseRequest");
const GoodsReceipt = require("../../models/GoodsReceipt");
const SupplierInvoice = require("../../models/SupplierInvoice");
const SupplierPayment = require("../../models/SupplierPayment");
const InventoryLedger = require("../../models/InventoryLedger");
const Product = require("../../models/Product");
const Warehouse = require("../../models/Warehouse");
const { asText, getScopedModels } = require("../../services/scopedModels");

function companyIdFrom(req) { return asText(req.query.companyId || req.body?.companyId || req.user?.companyId); }
function uidFrom(req) { return asText(req.user?.uid || req.user?._id || req.user?.userId); }
function makeDocNo(prefix) { return `${prefix}-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Date.now().toString().slice(-6)}`; }
function toMoney(value) { return Math.round(Number(value || 0) * 100) / 100; }
function normalizeLines(lines = []) {
  return Array.isArray(lines) ? lines.map((line, index) => {
    const qty = Number(line.qty || line.quantity || 0);
    const receivedQty = Number(line.receivedQty || qty || 0);
    const unitCost = Number(line.unitCost || line.cost || 0);
    const discountValue = Number(line.discountValue || 0);
    const taxPercent = Number(line.taxPercent || 0);
    const gross = qty * unitCost;
    const taxValue = ((gross - discountValue) * taxPercent) / 100;
    return {
      ...line,
      lineNo: Number(line.lineNo || index + 1),
      productId: asText(line.productId || line.itemId || line.productName),
      productCode: asText(line.productCode || line.code || line.sku),
      productName: asText(line.productName || line.name || "Procurement item"),
      uom: asText(line.uom || line.unit || "pack"),
      qty,
      receivedQty,
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

function requesterSnapshot(req) {
  return {
    partyType: "employee",
    partyId: uidFrom(req),
    partyName: asText(req.user?.fullName || req.user?.username || req.user?.email || "Requester"),
    mobile: asText(req.user?.mobile || req.user?.mobileNumber || req.user?.phone),
    address: asText(req.user?.branchName || req.user?.department),
  };
}
function warehouseSnapshot(source = {}) {
  return {
    partyType: "warehouse",
    partyId: asText(source._id || source.id || source.partyId || source.warehouseId),
    partyCode: asText(source.warehouseId || source.partyCode || source.code),
    partyName: asText(source.warehouseName || source.partyName || source.name || "Warehouse"),
    address: asText(source.address),
  };
}
async function scoped(req) {
  return getScopedModels(req, {
    SupplierModel: Supplier,
    PurchaseRequestModel: PurchaseRequest,
    PurchaseOrderModel: PurchaseOrder,
    GoodsReceiptModel: GoodsReceipt,
    SupplierInvoiceModel: SupplierInvoice,
    SupplierPaymentModel: SupplierPayment,
    InventoryLedgerModel: InventoryLedger,
    ProductModel: Product,
    WarehouseModel: Warehouse,
    UserModel: User,
  });
}
function supplierLookup(companyId, supplier = {}) {
  const clauses = [];
  if (supplier.partyId) clauses.push({ linkedUserId: supplier.partyId });
  if (supplier.partyCode) clauses.push({ supplierCode: supplier.partyCode });
  if (supplier.partyName) clauses.push({ supplierName: supplier.partyName });
  return clauses.length ? { companyId, $or: clauses } : { companyId, supplierName: supplier.partyName || "" };
}
async function updateSupplierBalance(SupplierModel, companyId, supplier, amount) {
  try { await SupplierModel.findOneAndUpdate(supplierLookup(companyId, supplier), { $inc: { currentBalance: toMoney(amount) } }); } catch (_e) {}
}
async function listSuppliers(req) {
  const { SupplierModel, UserModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const filter = { companyId };
  if (req.query.status && req.query.status !== "all") filter.status = asText(req.query.status);
  const supplierDocs = await SupplierModel.find(filter).sort({ supplierName: 1 }).lean();
  const legacyUsers = await UserModel.find({ companyId, role: /supplier/i }).select("_id username fullName email mobile mobileNumber status supplierWarehouseName1 supplierWarehouseName2").lean().catch(() => []);
  const mappedLegacy = legacyUsers.map((user) => ({
    _id: user._id, linkedUserId: String(user._id), supplierName: user.fullName || user.username, contactName: user.fullName || user.username,
    email: user.email, phone: user.mobile || user.mobileNumber, status: user.status || "active", source: "legacy_user",
    supplierWarehouseName1: user.supplierWarehouseName1, supplierWarehouseName2: user.supplierWarehouseName2,
  }));
  const existingLinked = new Set(supplierDocs.map((s) => String(s.linkedUserId || "")));
  return [...supplierDocs.map((s) => ({ ...s, source: "supplier_master" })), ...mappedLegacy.filter((u) => !existingLinked.has(String(u.linkedUserId || u._id)))];
}
async function listProducts(req) {
  const { ProductModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  return ProductModel.find({ companyId }).select("_id productId code sku name unit costPrice tradePrice wholesalePrice retailPrice customerPrice barcode category").sort({ name: 1 }).limit(1000).lean().catch(() => []);
}
async function listWarehouses(req) {
  const { WarehouseModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  return WarehouseModel.find({ companyId, status: { $ne: "inactive" } }).select("_id warehouseId name warehouseName address city status").sort({ name: 1 }).limit(500).lean().catch(() => []);
}
function normalizeSupplierPayload(req) {
  const body = req.body || {};
  return {
    companyId: companyIdFrom(req),
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
  };
}
async function createSupplier(req) {
  const { SupplierModel } = await scoped(req);
  const payload = normalizeSupplierPayload(req);
  if (!payload.companyId) throw new Error("Company is required for supplier master.");
  if (!payload.supplierName) throw new Error("Supplier name is required.");
  const doc = await SupplierModel.create({ ...payload, createdByUserId: uidFrom(req) });
  return doc;
}
async function updateSupplier(req) {
  const { SupplierModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const payload = normalizeSupplierPayload(req);
  if (!companyId) throw new Error("Company is required for supplier master.");
  if (!payload.supplierName) throw new Error("Supplier name is required.");
  const supplier = await SupplierModel.findOneAndUpdate(
    { _id: req.params.id, companyId },
    { $set: { ...payload, companyId, updatedByUserId: uidFrom(req) } },
    { new: true, runValidators: true },
  );
  if (!supplier) throw new Error("Supplier not found.");
  return supplier;
}
async function deleteSupplier(req) {
  const { SupplierModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  if (!companyId) throw new Error("Company is required for supplier master.");
  const supplier = await SupplierModel.findOneAndDelete({ _id: req.params.id, companyId });
  if (!supplier) throw new Error("Supplier not found.");
  return supplier;
}

async function listPurchaseRequests(req) {
  const { PurchaseRequestModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.status && req.query.status !== "all") filter.status = asText(req.query.status);
  return PurchaseRequestModel.find(filter).sort({ createdAt: -1 }).lean();
}

async function createPurchaseRequest(req) {
  const { PurchaseRequestModel, ProductModel, WarehouseModel } = await scoped(req);
  const body = req.body || {};
  const companyId = companyIdFrom(req);
  const lines = normalizeLines(body.lines || []);
  if (!lines.length) throw new Error("Add at least one requested item.");
  const totals = calculateTotals(lines, body.totals || {});
  let warehouse = body.targetWarehouse || body.warehouse || null;
  if (!warehouse && body.warehouseId) warehouse = await WarehouseModel.findOne({ companyId, $or: [{ _id: body.warehouseId }, { warehouseId: body.warehouseId }] }).lean().catch(() => null);
  return PurchaseRequestModel.create({
    companyId,
    documentNo: asText(body.documentNo || makeDocNo("PR")),
    requester: body.requester || requesterSnapshot(req),
    department: asText(body.department || req.user?.department),
    requiredDate: body.requiredDate ? new Date(body.requiredDate) : null,
    targetWarehouse: warehouse ? warehouseSnapshot(warehouse) : null,
    status: asText(body.status || "submitted"),
    lines,
    totals,
    createdByUserId: uidFrom(req),
    notes: asText(body.notes),
    statusHistory: [{ status: asText(body.status || "submitted"), changedBy: uidFrom(req), note: "Purchase request created" }],
  });
}

async function approvePurchaseRequest(req) {
  const { PurchaseRequestModel } = await scoped(req);
  const pr = await PurchaseRequestModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!pr) throw new Error("Purchase request not found");
  if (!["draft", "submitted"].includes(pr.status)) throw new Error(`Cannot approve purchase request because it is ${pr.status}.`);
  pr.status = "approved";
  pr.approvedByUserId = uidFrom(req);
  pr.statusHistory.push({ status: "approved", changedBy: uidFrom(req), note: "Approved for purchase order creation" });
  return pr.save();
}

async function convertPurchaseRequest(req) {
  const { PurchaseRequestModel, PurchaseOrderModel, SupplierModel } = await scoped(req);
  const pr = await PurchaseRequestModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!pr) throw new Error("Purchase request not found");
  if (pr.convertedPurchaseOrderId) return { purchaseRequest: pr, message: "Purchase request already converted." };
  if (pr.status !== "approved") throw new Error("Approve purchase request before converting it to purchase order.");
  const body = req.body || {};
  const supplierId = asText(body.supplierId || body.supplier?.partyId);
  if (!supplierId) throw new Error("Select supplier before converting PR to PO.");
  const supplierDoc = await SupplierModel.findOne({ companyId: pr.companyId, $or: [{ _id: supplierId }, { supplierCode: supplierId }, { linkedUserId: supplierId }] }).lean().catch(() => null);
  const supplier = supplierSnapshot(body.supplier || supplierDoc || { partyId: supplierId, partyName: body.supplierName });
  const po = await PurchaseOrderModel.create({
    companyId: pr.companyId,
    documentNo: asText(body.documentNo || makeDocNo("PO")),
    supplier,
    expectedDate: body.expectedDate ? new Date(body.expectedDate) : pr.requiredDate,
    orderDate: new Date(),
    warehouse: body.warehouse || pr.targetWarehouse || null,
    status: "pending_approval",
    lines: pr.lines,
    totals: pr.totals,
    balanceAmount: Number(pr.totals?.grandTotal || 0),
    notes: asText(body.notes || `Converted from purchase request ${pr.documentNo}`),
    createdByUserId: uidFrom(req),
    statusHistory: [{ status: "pending_approval", changedBy: uidFrom(req), note: `Converted from purchase request ${pr.documentNo}` }],
  });
  pr.status = "converted";
  pr.convertedPurchaseOrderId = po._id;
  pr.convertedPurchaseOrderNo = po.documentNo;
  pr.statusHistory.push({ status: "converted", changedBy: uidFrom(req), note: `Converted to purchase order ${po.documentNo}` });
  await pr.save();
  return { purchaseRequest: pr, purchaseOrder: po };
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
  const lines = normalizeLines(body.lines);
  const totals = calculateTotals(lines, body.totals || {});
  return PurchaseOrderModel.create({
    companyId: companyIdFrom(req),
    documentNo: asText(body.documentNo || makeDocNo("PO")),
    supplier: supplierSnapshot(body.supplier || body),
    expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
    orderDate: body.orderDate ? new Date(body.orderDate) : new Date(),
    warehouse: body.warehouse || null,
    status: asText(body.status || "pending_approval"),
    lines, totals, balanceAmount: totals.grandTotal,
    notes: asText(body.notes),
    createdByUserId: uidFrom(req),
    statusHistory: [{ status: asText(body.status || "pending_approval"), changedBy: uidFrom(req), note: "Purchase order created" }],
  });
}
async function approvePurchaseOrder(req) {
  const { PurchaseOrderModel } = await scoped(req);
  const doc = await PurchaseOrderModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!doc) throw new Error("Purchase order not found");
  if (["received", "closed", "cancelled"].includes(doc.status)) throw new Error(`Purchase order is already ${doc.status}`);
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
  if (!["approved", "partially_received"].includes(po.status)) throw new Error("Approve the purchase order before creating a GRN, or post the existing GRN first.");
  const existing = await GoodsReceiptModel.findOne({ purchaseOrderId: po._id, companyId: po.companyId, status: { $ne: "reversed" } }).sort({ createdAt: -1 });
  if (existing) {
    if (existing.status === "draft") return { purchaseOrder: po, goodsReceipt: existing, duplicateBlocked: true, message: "A draft GRN already exists for this purchase order. Post the existing GRN instead of creating another one." };
    throw new Error("This purchase order already has a posted GRN. Duplicate GRNs are blocked.");
  }
  const body = req.body || {};
  const lines = normalizeLines(body.lines?.length ? body.lines : po.lines).map((line) => ({ ...line, receivedQty: Number(line.receivedQty || line.qty || 0) }));
  const totals = calculateTotals(lines, body.totals || po.totals || {});
  const receipt = await GoodsReceiptModel.create({
    companyId: po.companyId, companyName: req.user?.companyName, documentNo: asText(body.documentNo || makeDocNo("GRN")),
    ownerType: "company", ownerId: po.companyId, purchaseOrderId: po._id, purchaseOrderNo: po.documentNo, supplier: po.supplier,
    receivedAtWarehouse: body.warehouse || po.warehouse || null, status: "draft", receivedAt: new Date(), lines, totals,
    createdByUserId: uidFrom(req), notes: asText(body.notes || `Draft receiving note against ${po.documentNo}`),
    statusHistory: [{ status: "draft", changedBy: uidFrom(req), note: "Draft GRN created from purchase order" }],
  });
  po.status = "receiving";
  po.statusHistory.push({ status: "receiving", changedBy: uidFrom(req), note: `Draft GRN ${receipt.documentNo} created` });
  await po.save();
  return { purchaseOrder: po, goodsReceipt: receipt };
}
async function postGoodsReceipt(req) {
  const { GoodsReceiptModel, PurchaseOrderModel, SupplierInvoiceModel, InventoryLedgerModel, SupplierModel } = await scoped(req);
  const grn = await GoodsReceiptModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!grn) throw new Error("Goods receipt not found");
  let invoice = await SupplierInvoiceModel.findOne({ companyId: grn.companyId, goodsReceiptId: grn._id });
  if (grn.status === "posted") return { goodsReceipt: grn, supplierInvoice: invoice, message: "GRN was already posted." };

  const existingLedgers = await InventoryLedgerModel.countDocuments({ companyId: grn.companyId, referenceType: "goods_receipt", referenceId: grn._id });
  if (!existingLedgers) {
    const warehouseId = asText(grn.receivedAtWarehouse?.partyId || grn.receivedAtWarehouse?.warehouseId || grn.receivedAtWarehouse?._id || "main");
    const warehouseName = asText(grn.receivedAtWarehouse?.partyName || grn.receivedAtWarehouse?.name || "Main Warehouse");
    const rows = (grn.lines || []).map((line) => ({
      companyId: grn.companyId, ownerType: "company", ownerId: grn.companyId, warehouseId, warehouseName,
      productId: asText(line.productId || line.productName), productCode: asText(line.productCode), productName: asText(line.productName), batchNo: asText(line.batchNo),
      movementType: "purchase_receipt", direction: "in", qty: Number(line.receivedQty || line.qty || 0), unitCost: Number(line.unitCost || 0),
      totalValue: toMoney(Number(line.receivedQty || line.qty || 0) * Number(line.unitCost || 0)),
      referenceType: "goods_receipt", referenceId: grn._id, referenceNo: grn.documentNo, postedByUserId: uidFrom(req), postedAt: new Date(),
    })).filter((row) => row.qty > 0 && row.productName);
    if (rows.length) await InventoryLedgerModel.insertMany(rows);
  }

  grn.status = "posted";
  grn.ledgerPosting = { postingState: "posted", postingKey: `GRN:${grn._id}`, postedAt: new Date() };
  grn.statusHistory.push({ status: "posted", changedBy: uidFrom(req), note: "GRN posted to inventory ledger" });
  await grn.save();

  if (!invoice) {
    const invoiceTotal = Number(grn.totals?.grandTotal || 0);
    invoice = await SupplierInvoiceModel.create({
      companyId: grn.companyId, documentNo: makeDocNo("SIN"), ownerType: "company", ownerId: grn.companyId,
      supplier: grn.supplier, purchaseOrderId: grn.purchaseOrderId, purchaseOrderNo: grn.purchaseOrderNo, goodsReceiptId: grn._id, goodsReceiptNo: grn.documentNo,
      invoiceDate: new Date(), status: "posted", paymentStatus: invoiceTotal > 0 ? "unpaid" : "paid", invoiceTotal, balanceAmount: invoiceTotal,
      lines: grn.lines, totals: grn.totals, ledgerPosting: { postingState: "posted", postingKey: `SIN:${grn._id}`, postedAt: new Date() },
      statusHistory: [{ status: "posted", changedBy: uidFrom(req), note: `Generated from posted GRN ${grn.documentNo}` }],
      createdByUserId: uidFrom(req), notes: `Auto-generated from ${grn.documentNo}`,
    });
    await updateSupplierBalance(SupplierModel, grn.companyId, grn.supplier, invoiceTotal);
  }

  if (grn.purchaseOrderId) {
    const po = await PurchaseOrderModel.findOne({ _id: grn.purchaseOrderId, companyId: grn.companyId });
    if (po) {
      po.receivedTotal = Number(grn.totals?.grandTotal || 0);
      po.balanceAmount = Math.max(0, Number(po.totals?.grandTotal || 0) - Number(po.receivedTotal || 0));
      po.status = po.balanceAmount <= 0 ? "received" : "partially_received";
      po.statusHistory.push({ status: po.status, changedBy: uidFrom(req), note: `Posted GRN ${grn.documentNo}; supplier invoice ${invoice.documentNo} generated` });
      await po.save();
    }
  }
  return { goodsReceipt: grn, supplierInvoice: invoice };
}
async function listGoodsReceipts(req) {
  const { GoodsReceiptModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.status && req.query.status !== "all") filter.status = asText(req.query.status);
  return GoodsReceiptModel.find(filter).sort({ createdAt: -1 }).lean();
}
async function listSupplierInvoices(req) { const { SupplierInvoiceModel } = await scoped(req); return SupplierInvoiceModel.find({ companyId: companyIdFrom(req) }).sort({ createdAt: -1 }).lean(); }
async function listSupplierPayments(req) { const { SupplierPaymentModel } = await scoped(req); return SupplierPaymentModel.find({ companyId: companyIdFrom(req) }).sort({ createdAt: -1 }).lean(); }

async function attachGoodsReceiptProof(req) {
  const { GoodsReceiptModel } = await scoped(req);
  const grn = await GoodsReceiptModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!grn) throw new Error("Goods receipt not found");
  const podUrl = asText(req.body?.podUrl || req.body?.attachmentUrl || req.body?.fileUrl);
  if (!podUrl) throw new Error("Proof document URL is required. Upload proof first, then attach its URL here.");
  grn.podUrl = podUrl;
  grn.statusHistory.push({ status: grn.status, changedBy: uidFrom(req), note: "Receiving proof attached" });
  return grn.save();
}

async function supplierStatement(req) {
  const { SupplierModel, PurchaseOrderModel, GoodsReceiptModel, SupplierInvoiceModel, SupplierPaymentModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const supplierId = asText(req.query.supplierId || req.params.id);
  if (!supplierId) throw new Error("Supplier is required for statement.");
  const supplier = await SupplierModel.findOne({ companyId, $or: [{ _id: supplierId }, { supplierCode: supplierId }, { linkedUserId: supplierId }] }).lean().catch(() => null);
  const supplierName = supplier?.supplierName || supplierId;
  const supplierClauses = [{ "supplier.partyId": supplierId }, { "supplier.partyCode": supplierId }, { "supplier.partyName": supplierName }];
  const [purchaseOrders, goodsReceipts, invoices, payments] = await Promise.all([
    PurchaseOrderModel.find({ companyId, $or: supplierClauses }).sort({ createdAt: -1 }).lean(),
    GoodsReceiptModel.find({ companyId, $or: supplierClauses }).sort({ createdAt: -1 }).lean(),
    SupplierInvoiceModel.find({ companyId, $or: supplierClauses }).sort({ invoiceDate: -1 }).lean(),
    SupplierPaymentModel.find({ companyId, $or: supplierClauses }).sort({ paymentDate: -1 }).lean(),
  ]);
  const invoiceTotal = invoices.reduce((sum, row) => sum + Number(row.invoiceTotal || 0), 0);
  const paymentTotal = payments.filter((p) => ["approved", "posted"].includes(String(p.status))).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const balance = invoices.reduce((sum, row) => sum + Number(row.balanceAmount || 0), 0);
  return { supplier: supplier || { supplierName }, kpis: { purchaseOrders: purchaseOrders.length, goodsReceipts: goodsReceipts.length, invoices: invoices.length, invoiceTotal: toMoney(invoiceTotal), paymentTotal: toMoney(paymentTotal), balance: toMoney(balance) }, purchaseOrders, goodsReceipts, invoices, payments };
}

async function printDocumentData(req) {
  const { PurchaseRequestModel, PurchaseOrderModel, GoodsReceiptModel, SupplierInvoiceModel, SupplierPaymentModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const type = asText(req.params.type);
  const models = { purchaseRequest: PurchaseRequestModel, purchaseOrder: PurchaseOrderModel, goodsReceipt: GoodsReceiptModel, supplierInvoice: SupplierInvoiceModel, supplierPayment: SupplierPaymentModel };
  const Model = models[type];
  if (!Model) throw new Error("Unsupported procurement print document type.");
  const document = await Model.findOne({ _id: req.params.id, companyId }).lean();
  if (!document) throw new Error("Document not found for print.");
  return { type, document, printMeta: { title: document.documentNo || type, generatedAt: new Date(), brand: "Rawyan ERP" } };
}

async function overview(req) {
  const { PurchaseRequestModel, PurchaseOrderModel, GoodsReceiptModel, SupplierInvoiceModel, SupplierPaymentModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const [suppliers, purchaseRequests, approvedRequests, purchaseOrders, openOrders, receipts, draftReceipts, postedReceipts, invoices, payments] = await Promise.all([
    listSuppliers(req),
    PurchaseRequestModel.countDocuments({ companyId }),
    PurchaseRequestModel.countDocuments({ companyId, status: "approved" }),
    PurchaseOrderModel.countDocuments({ companyId }),
    PurchaseOrderModel.countDocuments({ companyId, status: { $in: ["draft", "pending_approval", "approved", "receiving", "partially_received"] } }),
    GoodsReceiptModel.countDocuments({ companyId }),
    GoodsReceiptModel.countDocuments({ companyId, status: "draft" }),
    GoodsReceiptModel.countDocuments({ companyId, status: "posted" }),
    SupplierInvoiceModel.find({ companyId }).select("invoiceTotal balanceAmount paymentStatus").lean().catch(() => []),
    SupplierPaymentModel.find({ companyId }).select("amount status").lean().catch(() => []),
  ]);
  const invoiceTotal = invoices.reduce((sum, row) => sum + Number(row.invoiceTotal || 0), 0);
  const payableBalance = invoices.reduce((sum, row) => sum + Number(row.balanceAmount || 0), 0);
  const paidTotal = payments.filter((p) => ["approved", "posted"].includes(String(p.status))).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return { ok: true, kpis: { suppliers: suppliers.length, purchaseRequests, approvedRequests, purchaseOrders, openOrders, goodsReceipts: receipts, draftReceipts, postedReceipts, invoiceTotal, payableBalance, paidTotal } };
}
async function paySupplierInvoice(req) {
  const { SupplierInvoiceModel, SupplierPaymentModel, SupplierModel } = await scoped(req);
  const invoice = await SupplierInvoiceModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!invoice) throw new Error("Supplier invoice not found");
  if (invoice.status !== "posted") throw new Error("Only posted supplier invoices can be paid.");
  const balance = Number(invoice.balanceAmount || 0);
  if (balance <= 0) throw new Error("Supplier invoice is already paid.");
  const body = req.body || {};
  const amount = Math.min(balance, toMoney(body.amount || balance));
  if (amount <= 0) throw new Error("Payment amount must be greater than zero.");
  const payment = await SupplierPaymentModel.create({
    companyId: invoice.companyId, documentNo: makeDocNo("SPAY"), ownerType: "company", ownerId: invoice.companyId,
    supplier: invoice.supplier, paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(), amount,
    paymentMethod: asText(body.paymentMethod || "cash"), fromAccountId: asText(body.fromAccountId), status: "posted",
    allocations: [{ invoiceId: invoice._id, invoiceNo: invoice.documentNo, allocatedAmount: amount }],
    referenceNo: asText(body.referenceNo), ledgerPosting: { postingState: "posted", postingKey: `SPAY:${invoice._id}:${Date.now()}`, postedAt: new Date() },
    statusHistory: [{ status: "posted", changedBy: uidFrom(req), note: `Payment posted against ${invoice.documentNo}` }],
    createdByUserId: uidFrom(req), notes: asText(body.notes),
  });
  invoice.allocatedPaymentTotal = toMoney(Number(invoice.allocatedPaymentTotal || 0) + amount);
  invoice.balanceAmount = toMoney(Math.max(0, Number(invoice.invoiceTotal || 0) - Number(invoice.allocatedPaymentTotal || 0)));
  invoice.paymentStatus = invoice.balanceAmount <= 0 ? "paid" : "partial";
  invoice.statusHistory.push({ status: invoice.paymentStatus, changedBy: uidFrom(req), note: `Payment ${payment.documentNo} posted` });
  await invoice.save();
  await updateSupplierBalance(SupplierModel, invoice.companyId, invoice.supplier, -amount);
  return { supplierInvoice: invoice, supplierPayment: payment };
}
module.exports = { overview, listSuppliers, listProducts, listWarehouses, createSupplier, updateSupplier, deleteSupplier, listPurchaseRequests, createPurchaseRequest, approvePurchaseRequest, convertPurchaseRequest, listPurchaseOrders, createPurchaseOrder, approvePurchaseOrder, receivePurchaseOrder, postGoodsReceipt, attachGoodsReceiptProof, listGoodsReceipts, listSupplierInvoices, listSupplierPayments, paySupplierInvoice, supplierStatement, printDocumentData };
