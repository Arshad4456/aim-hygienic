const PosSession = require("../../models/PosSession");
const PosSale = require("../../models/PosSale");
const Product = require("../../models/Product");
const Customer = require("../../models/User");
const Warehouse = require("../../models/Warehouse");
const InventoryLedger = require("../../models/InventoryLedger");
const { asText, getScopedModels } = require("../../services/scopedModels");

function companyIdFrom(req) { return asText(req.query.companyId || req.body?.companyId || req.user?.companyId); }
function uidFrom(req) { return asText(req.user?.uid || req.user?._id || req.user?.userId); }
function toNumber(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function money(value) { return Math.round(Number(value || 0) * 100) / 100; }
function docNo(prefix) { return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-6)}`; }
function statusEntry(status, userId, note = "") { return { status, changedBy: userId, changedAt: new Date(), note }; }

async function scoped(req) {
  return getScopedModels(req, {
    PosSessionModel: PosSession,
    PosSaleModel: PosSale,
    ProductModel: Product,
    UserModel: Customer,
    WarehouseModel: Warehouse,
    InventoryLedgerModel: InventoryLedger,
  });
}

async function resolveProduct(ProductModel, companyId, rawLine = {}) {
  const key = asText(rawLine.productId || rawLine.productCode || rawLine.sku || rawLine.barcode);
  let product = null;
  if (key) {
    const or = [{ productId: key }, { code: key }, { sku: key }, { barcode: key }, { bulkBarcode: key }];
    if (/^[a-f\d]{24}$/i.test(key)) or.push({ _id: key });
    product = await ProductModel.findOne({ companyId, $or: or }).lean().catch(() => null);
  }
  if (!product && rawLine.productName) product = await ProductModel.findOne({ companyId, name: asText(rawLine.productName) }).lean().catch(() => null);
  if (!product && !asText(rawLine.productName)) throw new Error("Product is required in every POS line.");
  return {
    product,
    productId: asText(product?.productId || product?._id || rawLine.productId),
    productCode: asText(product?.code || product?.sku || rawLine.productCode || rawLine.barcode),
    productName: asText(product?.name || rawLine.productName || "Retail item"),
    uom: asText(rawLine.uom || product?.unit || "unit"),
    costPrice: money(rawLine.unitCost ?? product?.costPrice ?? product?.tradePrice ?? 0),
    unitPrice: money(rawLine.unitPrice ?? rawLine.price ?? product?.retailPrice ?? product?.customerPrice ?? product?.tradePrice ?? 0),
    taxPercent: toNumber(rawLine.taxPercent ?? product?.taxPer ?? 0),
  };
}

function calculateLine(rawLine, product, lineNo) {
  const qty = toNumber(rawLine.qty || rawLine.quantity || 1);
  if (qty <= 0) throw new Error("Quantity must be greater than zero.");
  const unitPrice = money(rawLine.unitPrice ?? product.unitPrice);
  const unitCost = money(rawLine.unitCost ?? product.costPrice);
  const discountValue = money(rawLine.discountValue || rawLine.discount || 0);
  const taxPercent = toNumber(rawLine.taxPercent ?? product.taxPercent);
  const taxableAmount = Math.max(0, qty * unitPrice - discountValue);
  const taxValue = money((taxableAmount * taxPercent) / 100);
  const netLineAmount = money(taxableAmount + taxValue);
  return {
    lineNo,
    productId: product.productId,
    productCode: product.productCode,
    productName: product.productName,
    uom: product.uom,
    qty,
    unitCost,
    unitPrice,
    discountValue,
    taxPercent,
    taxValue,
    netLineAmount,
    batchNo: asText(rawLine.batchNo),
    notes: asText(rawLine.notes),
  };
}

function calculateTotals(lines = []) {
  const subtotal = money(lines.reduce((sum, line) => sum + toNumber(line.qty) * toNumber(line.unitPrice), 0));
  const discountTotal = money(lines.reduce((sum, line) => sum + toNumber(line.discountValue), 0));
  const taxTotal = money(lines.reduce((sum, line) => sum + toNumber(line.taxValue), 0));
  const grandTotal = money(subtotal - discountTotal + taxTotal);
  return { subtotal, discountTotal, taxTotal, freightTotal: 0, otherChargesTotal: 0, grandTotal };
}

async function resolveWarehouse(WarehouseModel, companyId, body = {}) {
  const key = asText(body.warehouseId);
  const name = asText(body.warehouseName);
  let warehouse = null;
  if (key) {
    const or = [{ warehouseId: key }];
    if (/^[a-f\d]{24}$/i.test(key)) or.push({ _id: key });
    warehouse = await WarehouseModel.findOne({ companyId, $or: or }).lean().catch(() => null);
  }
  if (!warehouse && name) warehouse = await WarehouseModel.findOne({ companyId, name }).lean().catch(() => null);
  return { warehouseId: asText(warehouse?.warehouseId || warehouse?._id || key || "main"), warehouseName: asText(warehouse?.name || name || "Main Warehouse") };
}

async function availableQty(InventoryLedgerModel, companyId, warehouseId, productId, batchNo = "") {
  const match = { companyId, ownerType: "company", ownerId: companyId, warehouseId, productId };
  if (batchNo) match.batchNo = batchNo;
  const rows = await InventoryLedgerModel.aggregate([
    { $match: match },
    { $group: { _id: null, inQty: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$qty", 0] } }, outQty: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$qty", 0] } } } },
    { $project: { _id: 0, balanceQty: { $subtract: ["$inQty", "$outQty"] } } },
  ]).catch(() => []);
  return toNumber(rows[0]?.balanceQty);
}

async function postSaleLedger(req, sale, direction = "out") {
  const { InventoryLedgerModel } = await scoped(req);
  const movementType = direction === "out" ? "pos_sale" : "pos_return";
  const rows = [];
  for (const line of sale.lines || []) {
    rows.push(await InventoryLedgerModel.create({
      companyId: sale.companyId,
      ownerType: "company",
      ownerId: sale.companyId,
      warehouseId: sale.warehouseId,
      warehouseName: sale.warehouseName,
      productId: line.productId,
      productCode: line.productCode,
      productName: line.productName,
      batchNo: line.batchNo,
      movementType,
      direction,
      qty: toNumber(line.qty),
      unitCost: money(line.unitCost),
      totalValue: money(toNumber(line.qty) * toNumber(line.unitCost)),
      referenceType: direction === "out" ? "pos_sale" : "pos_return",
      referenceId: sale._id,
      referenceNo: sale.documentNo,
      postedAt: new Date(),
      postedByUserId: uidFrom(req),
    }));
  }
  return rows;
}

async function openSession(req) {
  const { PosSessionModel, WarehouseModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  if (!companyId) throw new Error("Company is required.");
  const userId = uidFrom(req);
  const existing = await PosSessionModel.findOne({ companyId, cashierId: userId, status: "open" }).lean();
  if (existing && req.body?.force !== true) return { session: existing, alreadyOpen: true };
  const warehouse = await resolveWarehouse(WarehouseModel, companyId, req.body || {});
  const session = await PosSessionModel.create({
    companyId,
    sessionNo: asText(req.body?.sessionNo) || docNo("POS-SESSION"),
    branchId: asText(req.body?.branchId),
    branchName: asText(req.body?.branchName),
    warehouseId: warehouse.warehouseId,
    warehouseName: warehouse.warehouseName,
    cashRegisterId: asText(req.body?.cashRegisterId || "REG-01"),
    cashRegisterName: asText(req.body?.cashRegisterName || "Main Register"),
    cashierId: userId,
    cashierName: asText(req.user?.username || req.body?.cashierName),
    openingCash: money(req.body?.openingCash),
    statusHistory: [statusEntry("open", userId, "POS session opened")],
    notes: asText(req.body?.notes),
  });
  return { session };
}

async function closeSession(req) {
  const { PosSessionModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const session = await PosSessionModel.findOne({ _id: req.params.id, companyId });
  if (!session) throw new Error("POS session not found.");
  if (session.status === "closed") return { session };
  const closingCash = money(req.body?.closingCash ?? session.expectedCash);
  session.closingCash = closingCash;
  session.cashDifference = money(closingCash - session.expectedCash);
  session.status = "closed";
  session.closedAt = new Date();
  session.statusHistory.push(statusEntry("closed", uidFrom(req), asText(req.body?.notes || "POS session closed")));
  await session.save();
  return { session };
}

async function listSessions(req) {
  const { PosSessionModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.status) filter.status = asText(req.query.status);
  if (req.query.cashierId) filter.cashierId = asText(req.query.cashierId);
  return PosSessionModel.find(filter).sort({ openedAt: -1 }).limit(300).lean();
}

async function listProducts(req) {
  const { ProductModel, InventoryLedgerModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const products = await ProductModel.find({ companyId }).sort({ name: 1 }).limit(500).lean().catch(() => []);
  const stock = await InventoryLedgerModel.aggregate([
    { $match: { companyId, ownerType: "company", ownerId: companyId } },
    { $group: { _id: "$productId", inQty: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$qty", 0] } }, outQty: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$qty", 0] } } } },
    { $project: { balanceQty: { $subtract: ["$inQty", "$outQty"] } } },
  ]).catch(() => []);
  const stockMap = new Map(stock.map((row) => [String(row._id), toNumber(row.balanceQty)]));
  return products.map((p) => ({ ...p, availableQty: stockMap.get(String(p.productId || p._id)) || stockMap.get(String(p._id)) || 0 }));
}

async function listCustomers(req) {
  const { UserModel } = await scoped(req);
  return UserModel.find({ companyId: companyIdFrom(req), $or: [{ role: /customer/i }, { portalType: /customer/i }] }).select("_id userId username fullName mobile address role portalType").limit(300).lean().catch(() => []);
}

async function listSales(req) {
  const { PosSaleModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.sessionId) filter.sessionId = req.query.sessionId;
  if (req.query.status) filter.status = asText(req.query.status);
  return PosSaleModel.find(filter).sort({ saleDate: -1, createdAt: -1 }).limit(500).lean();
}

async function createSale(req) {
  const { PosSessionModel, PosSaleModel, ProductModel, WarehouseModel, InventoryLedgerModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  if (!companyId) throw new Error("Company is required.");
  const userId = uidFrom(req);
  let session = null;
  if (req.body?.sessionId) session = await PosSessionModel.findOne({ _id: req.body.sessionId, companyId, status: "open" });
  if (!session) session = await PosSessionModel.findOne({ companyId, cashierId: userId, status: "open" });
  if (!session) ({ session } = await openSession(req));
  const warehouse = await resolveWarehouse(WarehouseModel, companyId, { warehouseId: req.body?.warehouseId || session.warehouseId, warehouseName: req.body?.warehouseName || session.warehouseName });
  const rawLines = Array.isArray(req.body?.lines) ? req.body.lines : [];
  if (!rawLines.length) throw new Error("At least one POS line is required.");
  const lines = [];
  for (let i = 0; i < rawLines.length; i += 1) {
    const resolved = await resolveProduct(ProductModel, companyId, rawLines[i]);
    const line = calculateLine(rawLines[i], resolved, i + 1);
    const available = await availableQty(InventoryLedgerModel, companyId, warehouse.warehouseId, line.productId, line.batchNo);
    if (available < line.qty && req.body?.allowNegativeStock !== true) throw new Error(`Insufficient stock for ${line.productName}. Available: ${available}`);
    lines.push(line);
  }
  const totals = calculateTotals(lines);
  const amountPaid = money(req.body?.amountPaid ?? totals.grandTotal);
  const sale = await PosSaleModel.create({
    companyId,
    documentNo: asText(req.body?.documentNo) || docNo("POS"),
    sessionId: session._id,
    sessionNo: session.sessionNo,
    branchId: asText(req.body?.branchId || session.branchId),
    branchName: asText(req.body?.branchName || session.branchName),
    warehouseId: warehouse.warehouseId,
    warehouseName: warehouse.warehouseName,
    cashierId: userId,
    cashierName: asText(req.user?.username || req.body?.cashierName || session.cashierName),
    customer: {
      partyType: asText(req.body?.customer?.partyType || "walk_in"),
      partyId: asText(req.body?.customer?.partyId || req.body?.customerId),
      partyName: asText(req.body?.customer?.partyName || req.body?.customerName || "Walk-in Customer"),
      mobile: asText(req.body?.customer?.mobile || req.body?.mobile),
      address: asText(req.body?.customer?.address || req.body?.address),
    },
    saleDate: req.body?.saleDate ? new Date(req.body.saleDate) : new Date(),
    lines,
    totals,
    paymentMethod: asText(req.body?.paymentMethod || "cash"),
    amountPaid,
    changeDue: money(amountPaid - totals.grandTotal),
    status: "posted",
    statusHistory: [statusEntry("posted", userId, "Retail POS sale posted")],
    createdByUserId: userId,
    notes: asText(req.body?.notes),
  });
  const ledger = await postSaleLedger(req, sale, "out");
  session.totalSales = money(toNumber(session.totalSales) + totals.grandTotal);
  session.totalDiscount = money(toNumber(session.totalDiscount) + totals.discountTotal);
  session.totalTax = money(toNumber(session.totalTax) + totals.taxTotal);
  session.totalOrders = toNumber(session.totalOrders) + 1;
  session.expectedCash = money(toNumber(session.expectedCash) + (sale.paymentMethod === "cash" ? sale.amountPaid - Math.max(0, sale.changeDue) : 0));
  session.paymentBreakdown = session.paymentBreakdown || {};
  session.paymentBreakdown[sale.paymentMethod] = money(toNumber(session.paymentBreakdown[sale.paymentMethod]) + sale.amountPaid - Math.max(0, sale.changeDue));
  await session.save();
  return { sale, ledger };
}

async function returnSale(req) {
  const { PosSaleModel, PosSessionModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const original = await PosSaleModel.findOne({ _id: req.params.id, companyId });
  if (!original) throw new Error("POS sale not found.");
  if (original.status === "returned") throw new Error("Sale is already returned.");
  const returnLines = (Array.isArray(req.body?.lines) && req.body.lines.length ? req.body.lines : original.lines).map((line, index) => ({ ...line, lineNo: index + 1, qty: Math.min(toNumber(line.qty), toNumber((original.lines || [])[index]?.qty || line.qty)) }));
  const totals = calculateTotals(returnLines);
  const sale = await PosSaleModel.create({
    ...original.toObject(),
    _id: undefined,
    documentNo: docNo("POS-RET"),
    lines: returnLines,
    totals,
    amountPaid: -Math.abs(totals.grandTotal),
    changeDue: 0,
    status: "posted",
    returnOfSaleId: original._id,
    returnReason: asText(req.body?.reason),
    saleDate: new Date(),
    statusHistory: [statusEntry("posted", uidFrom(req), "Retail POS return posted")],
    createdAt: undefined,
    updatedAt: undefined,
  });
  const ledger = await postSaleLedger(req, sale, "in");
  original.status = "returned";
  original.returnReason = asText(req.body?.reason);
  original.statusHistory.push(statusEntry("returned", uidFrom(req), asText(req.body?.reason)));
  await original.save();
  const session = sale.sessionId ? await PosSessionModel.findOne({ _id: sale.sessionId, companyId }) : null;
  if (session) {
    session.totalReturns = money(toNumber(session.totalReturns) + totals.grandTotal);
    session.expectedCash = money(toNumber(session.expectedCash) - totals.grandTotal);
    await session.save();
  }
  return { returnSale: sale, original, ledger };
}

async function overview(req) {
  const { PosSessionModel, PosSaleModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const [openSessions, sessions, salesAgg, recentSales] = await Promise.all([
    PosSessionModel.countDocuments({ companyId, status: "open" }).catch(() => 0),
    PosSessionModel.find({ companyId }).sort({ openedAt: -1 }).limit(5).lean().catch(() => []),
    PosSaleModel.aggregate([
      { $match: { companyId, status: { $in: ["posted", "returned"] } } },
      { $group: { _id: null, totalSales: { $sum: "$totals.grandTotal" }, totalOrders: { $sum: 1 }, totalTax: { $sum: "$totals.taxTotal" }, totalDiscount: { $sum: "$totals.discountTotal" } } },
    ]).catch(() => []),
    PosSaleModel.find({ companyId }).sort({ saleDate: -1 }).limit(10).lean().catch(() => []),
  ]);
  return { openSessions, sessions, recentSales, kpis: salesAgg[0] || { totalSales: 0, totalOrders: 0, totalTax: 0, totalDiscount: 0 } };
}

async function printDocument(req) {
  const { PosSessionModel, PosSaleModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  if (req.params.type === "session") {
    const session = await PosSessionModel.findOne({ _id: req.params.id, companyId }).lean();
    if (!session) throw new Error("Session not found.");
    const sales = await PosSaleModel.find({ sessionId: session._id, companyId }).lean();
    return { type: "pos-session", session, sales };
  }
  const sale = await PosSaleModel.findOne({ _id: req.params.id, companyId }).lean();
  if (!sale) throw new Error("POS sale not found.");
  return { type: "pos-receipt", sale };
}

module.exports = { overview, openSession, closeSession, listSessions, listProducts, listCustomers, listSales, createSale, returnSale, printDocument };
