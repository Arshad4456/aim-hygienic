const User = require("../../models/User");
const Product = require("../../models/Product");
const Warehouse = require("../../models/Warehouse");
const InventoryLedger = require("../../models/InventoryLedger");
const CompanySalesOrder = require("../../models/CompanySalesOrder");
const CompanyDispatchNote = require("../../models/CompanyDispatchNote");
const CompanyInvoiceToDistributor = require("../../models/CompanyInvoiceToDistributor");
const DistributorStockReceipt = require("../../models/DistributorStockReceipt");
const SecondaryOrder = require("../../models/SecondaryOrder");
const CustomerInvoice = require("../../models/CustomerInvoice");
const CustomerReceipt = require("../../models/CustomerReceipt");
const { asText, getScopedModels } = require("../../services/scopedModels");

function companyIdFrom(req) { return asText(req.query.companyId || req.body?.companyId || req.user?.companyId); }
function uidFrom(req) { return asText(req.user?.uid || req.user?._id || req.user?.userId); }
function makeDocNo(prefix) { return `${prefix}-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Date.now().toString().slice(-6)}`; }
function toMoney(value) { return Math.round(Number(value || 0) * 100) / 100; }
function asId(value) { return asText(value?._id || value?.id || value); }

async function scoped(req) {
  return getScopedModels(req, {
    UserModel: User,
    ProductModel: Product,
    WarehouseModel: Warehouse,
    InventoryLedgerModel: InventoryLedger,
    CompanySalesOrderModel: CompanySalesOrder,
    CompanyDispatchNoteModel: CompanyDispatchNote,
    CompanyInvoiceModel: CompanyInvoiceToDistributor,
    DistributorStockReceiptModel: DistributorStockReceipt,
    SecondaryOrderModel: SecondaryOrder,
    CustomerInvoiceModel: CustomerInvoice,
    CustomerReceiptModel: CustomerReceipt,
  });
}

function distributorSnapshot(source = {}) {
  return {
    partyType: "distributor",
    partyId: asText(source._id || source.id || source.partyId || source.distributorId || source.userId),
    partyCode: asText(source.userId || source.distributorCode || source.partyCode || source.code),
    partyName: asText(source.distributorName || source.partyName || source.fullName || source.username || source.name || "Distributor"),
    contactName: asText(source.contactName || source.fullName || source.username),
    mobile: asText(source.mobile || source.mobileNumber || source.phoneNumber || source.phone),
    address: asText(source.address || source.shopAddress),
  };
}

function customerSnapshot(source = {}) {
  return {
    partyType: "customer",
    partyId: asText(source._id || source.id || source.partyId || source.customerId || source.userId),
    partyCode: asText(source.userId || source.customerCode || source.partyCode || source.code),
    partyName: asText(source.customerName || source.partyName || source.fullName || source.username || source.name || "Customer"),
    contactName: asText(source.contactName || source.fullName || source.username),
    mobile: asText(source.mobile || source.mobileNumber || source.phoneNumber || source.phone),
    address: asText(source.address || source.shopAddress),
  };
}

function warehouseSnapshot(source = {}) {
  return {
    partyType: "warehouse",
    partyId: asText(source._id || source.id || source.partyId || source.warehouseId),
    partyCode: asText(source.warehouseId || source.partyCode || source.code),
    partyName: asText(source.warehouseName || source.partyName || source.name || "Company Warehouse"),
    contactName: asText(source.managerName || source.contactName),
    mobile: asText(source.mobileNumber || source.phoneNumber || source.phone),
    address: asText(source.address),
  };
}

function normalizeLine(line = {}, index = 0) {
  const qty = Number(line.qty || line.quantity || line.dispatchQty || 0);
  const unitPrice = Number(line.unitPrice ?? line.price ?? line.tradePrice ?? line.wholesalePrice ?? line.unitCost ?? 0);
  const unitCost = Number(line.unitCost ?? line.costPrice ?? line.cost ?? 0);
  const discountValue = Number(line.discountValue || 0);
  const taxPercent = Number(line.taxPercent || 0);
  const gross = qty * unitPrice;
  const taxValue = Number(line.taxValue ?? ((gross - discountValue) * taxPercent) / 100);
  return {
    ...line,
    lineNo: Number(line.lineNo || index + 1),
    productId: asText(line.productId || line.itemId || line.productName || line.name),
    productCode: asText(line.productCode || line.code || line.sku),
    productName: asText(line.productName || line.name || "Primary sale item"),
    uom: asText(line.uom || line.unit || "pack"),
    qty,
    dispatchedQty: Number(line.dispatchedQty || qty || 0),
    receivedQty: Number(line.receivedQty || 0),
    unitPrice,
    unitCost,
    discountValue: toMoney(discountValue),
    taxPercent,
    taxValue: toMoney(taxValue),
    netLineAmount: toMoney(line.netLineAmount ?? gross - discountValue + taxValue),
  };
}

function normalizeLines(lines = []) {
  return Array.isArray(lines) ? lines.map(normalizeLine).filter((line) => line.productName && Number(line.qty || 0) > 0) : [];
}

function calculateTotals(lines = [], supplied = {}) {
  const subtotal = lines.reduce((sum, line) => sum + Number(line.qty || 0) * Number(line.unitPrice || 0), 0);
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

async function listDistributors(req) {
  const { UserModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  return UserModel.find({ companyId, $or: [{ role: /distributor/i }, { portalType: /distributor/i }] })
    .select("_id userId username fullName mobile mobileNumber phoneNumber email status distributorId distributorName warehouseId warehouseName address shopAddress")
    .sort({ fullName: 1, username: 1 })
    .lean();
}

async function listProducts(req) {
  const { ProductModel, InventoryLedgerModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const products = await ProductModel.find({ companyId }).sort({ name: 1 }).limit(500).lean().catch(() => []);
  const stockRows = await InventoryLedgerModel.aggregate([
    { $match: { companyId, ownerType: "company", ownerId: companyId } },
    { $group: { _id: "$productId", inQty: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$qty", 0] } }, outQty: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$qty", 0] } } } },
    { $project: { _id: 1, balanceQty: { $subtract: ["$inQty", "$outQty"] } } },
  ]).catch(() => []);
  const stock = new Map(stockRows.map((row) => [String(row._id || ""), Number(row.balanceQty || 0)]));
  return products.map((product) => ({ ...product, availableQty: stock.get(String(product.productId || product._id || product.name)) || 0 }));
}

async function listWarehouses(req) {
  const { WarehouseModel } = await scoped(req);
  return WarehouseModel.find({ companyId: companyIdFrom(req), status: { $ne: "inactive" } }).sort({ name: 1 }).lean().catch(() => []);
}

async function listPrimaryOrders(req) {
  const { CompanySalesOrderModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.status && req.query.status !== "all") filter.status = asText(req.query.status);
  if (req.query.distributorId) filter.distributorId = asText(req.query.distributorId);
  return CompanySalesOrderModel.find(filter).sort({ createdAt: -1 }).lean();
}

async function createPrimaryOrder(req) {
  const { CompanySalesOrderModel, UserModel, WarehouseModel } = await scoped(req);
  const body = req.body || {};
  const companyId = companyIdFrom(req);
  const distributorId = asText(body.distributorId || body.distributor?.partyId);
  if (!distributorId) throw new Error("Select distributor before creating a primary sales order.");
  const distributorDoc = await UserModel.findOne({ companyId, $or: [{ _id: distributorId }, { userId: distributorId }, { distributorId }] }).lean().catch(() => null);
  const distributor = distributorSnapshot(body.distributor || distributorDoc || { partyId: distributorId, partyName: body.distributorName });
  const warehouseDoc = body.dispatchFromWarehouse?.partyId
    ? await WarehouseModel.findOne({ companyId, $or: [{ _id: body.dispatchFromWarehouse.partyId }, { warehouseId: body.dispatchFromWarehouse.partyId }] }).lean().catch(() => null)
    : await WarehouseModel.findOne({ companyId, status: { $ne: "inactive" } }).sort({ createdAt: 1 }).lean().catch(() => null);
  const lines = normalizeLines(body.lines);
  if (!lines.length) throw new Error("Add at least one product line.");
  const totals = calculateTotals(lines, body.totals || {});
  return CompanySalesOrderModel.create({
    companyId,
    companyName: asText(req.user?.companyName),
    documentNo: asText(body.documentNo || makeDocNo("PSO")),
    ownerType: "company",
    ownerId: companyId,
    distributorId: distributor.partyId || distributorId,
    distributor,
    dispatchFromWarehouse: warehouseSnapshot(body.dispatchFromWarehouse || warehouseDoc || {}),
    receiveAtWarehouse: warehouseSnapshot(body.receiveAtWarehouse || { partyId: distributorDoc?.warehouseId || distributorId, partyName: distributorDoc?.warehouseName || `${distributor.partyName} Warehouse` }),
    freightPayer: asText(body.freightPayer || "company"),
    deliveryMode: asText(body.deliveryMode || "company_truck"),
    status: asText(body.status || "draft"),
    financialStatus: "not_invoiced",
    lines,
    totals,
    createdByUserId: uidFrom(req),
    notes: asText(body.notes),
    statusHistory: [{ status: asText(body.status || "draft"), changedBy: uidFrom(req), note: "Primary sales order created" }],
  });
}

async function approvePrimaryOrder(req) {
  const { CompanySalesOrderModel } = await scoped(req);
  const order = await CompanySalesOrderModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!order) throw new Error("Primary sales order not found");
  if (["cancelled", "closed", "dispatched", "received", "invoiced"].includes(order.status)) throw new Error(`Cannot approve order because it is ${order.status}.`);
  order.status = "approved";
  order.approvedByUserId = uidFrom(req);
  order.statusHistory.push({ status: "approved", changedBy: uidFrom(req), note: "Approved for dispatch" });
  return order.save();
}

async function createDispatchFromOrder(req) {
  const { CompanySalesOrderModel, CompanyDispatchNoteModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const order = await CompanySalesOrderModel.findOne({ _id: req.params.id, companyId });
  if (!order) throw new Error("Primary sales order not found");
  if (!["approved", "reserved", "ready_to_dispatch"].includes(order.status)) throw new Error("Approve the primary sales order before creating dispatch.");
  const existing = await CompanyDispatchNoteModel.findOne({ companySalesOrderId: order._id, companyId, status: { $ne: "reversed" } }).sort({ createdAt: -1 });
  if (existing) return { order, dispatch: existing, duplicateBlocked: true, message: "A dispatch note already exists for this sales order." };
  const body = req.body || {};
  const lines = normalizeLines(body.lines?.length ? body.lines : order.lines).map((line) => ({ ...line, dispatchedQty: Number(line.dispatchedQty || line.qty || 0) }));
  const dispatch = await CompanyDispatchNoteModel.create({
    companyId,
    documentNo: asText(body.documentNo || makeDocNo("CDN")),
    ownerType: "company",
    ownerId: companyId,
    companySalesOrderId: order._id,
    distributorId: order.distributorId,
    dispatchFromWarehouse: order.dispatchFromWarehouse,
    transporter: body.transporter || null,
    vehicleId: asText(body.vehicleId),
    driverUserId: asText(body.driverUserId),
    status: "draft",
    lines,
    createdByUserId: uidFrom(req),
    notes: asText(body.notes),
    statusHistory: [{ status: "draft", changedBy: uidFrom(req), note: "Dispatch note created from primary sales order" }],
  });
  order.status = "ready_to_dispatch";
  order.statusHistory.push({ status: "ready_to_dispatch", changedBy: uidFrom(req), note: `Dispatch ${dispatch.documentNo} created` });
  await order.save();
  return { order, dispatch };
}

async function stockBalanceForOwner(InventoryLedgerModel, { companyId, ownerType, ownerId, warehouseId, line }) {
  const match = { companyId, ownerType, ownerId };
  if (warehouseId) match.warehouseId = warehouseId;
  if (line.productId) match.productId = asText(line.productId);
  else match.productName = asText(line.productName);
  const rows = await InventoryLedgerModel.aggregate([
    { $match: match },
    { $group: { _id: null, inQty: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$qty", 0] } }, outQty: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$qty", 0] } } } },
    { $project: { _id: 0, balanceQty: { $subtract: ["$inQty", "$outQty"] } } },
  ]);
  return Number(rows?.[0]?.balanceQty || 0);
}

async function stockBalance(InventoryLedgerModel, companyId, warehouseId, line) {
  return stockBalanceForOwner(InventoryLedgerModel, { companyId, ownerType: "company", ownerId: companyId, warehouseId, line });
}

async function oldStockBalanceUnused(InventoryLedgerModel, companyId, warehouseId, line) {
  const match = { companyId, ownerType: "company", ownerId: companyId };
  if (warehouseId) match.warehouseId = warehouseId;
  if (line.productId) match.productId = asText(line.productId);
  else match.productName = asText(line.productName);
  const rows = await InventoryLedgerModel.aggregate([
    { $match: match },
    { $group: { _id: null, inQty: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$qty", 0] } }, outQty: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$qty", 0] } } } },
    { $project: { _id: 0, balanceQty: { $subtract: ["$inQty", "$outQty"] } } },
  ]);
  return Number(rows?.[0]?.balanceQty || 0);
}

async function postDispatch(req) {
  const { CompanySalesOrderModel, CompanyDispatchNoteModel, CompanyInvoiceModel, DistributorStockReceiptModel, InventoryLedgerModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const dispatch = await CompanyDispatchNoteModel.findOne({ _id: req.params.id, companyId });
  if (!dispatch) throw new Error("Dispatch note not found");
  if (dispatch.status !== "draft") throw new Error(`Dispatch is already ${dispatch.status}.`);
  const order = await CompanySalesOrderModel.findOne({ _id: dispatch.companySalesOrderId, companyId });
  if (!order) throw new Error("Linked primary sales order not found");
  const warehouseId = dispatch.dispatchFromWarehouse?.partyId || order.dispatchFromWarehouse?.partyId || "company-main";
  for (const rawLine of dispatch.lines || []) {
    const line = normalizeLine(rawLine);
    const qty = Number(line.dispatchedQty || line.qty || 0);
    if (qty <= 0) continue;
    const available = await stockBalance(InventoryLedgerModel, companyId, warehouseId, line);
    if (available < qty) throw new Error(`Not enough stock for ${line.productName}. Available ${available}, required ${qty}.`);
  }
  const ledgerRows = [];
  for (const rawLine of dispatch.lines || []) {
    const line = normalizeLine(rawLine);
    const qty = Number(line.dispatchedQty || line.qty || 0);
    if (qty <= 0) continue;
    ledgerRows.push({
      companyId,
      ownerType: "company",
      ownerId: companyId,
      distributorId: order.distributorId,
      warehouseId,
      warehouseName: dispatch.dispatchFromWarehouse?.partyName || order.dispatchFromWarehouse?.partyName || "Company Warehouse",
      productId: line.productId,
      productCode: line.productCode,
      productName: line.productName,
      batchNo: line.batchNo,
      movementType: "company_dispatch",
      direction: "out",
      qty,
      unitCost: Number(line.unitCost || 0),
      totalValue: toMoney(qty * Number(line.unitCost || line.unitPrice || 0)),
      referenceType: "CompanyDispatchNote",
      referenceId: dispatch._id,
      referenceNo: dispatch.documentNo,
      postedByUserId: uidFrom(req),
    });
  }
  if (ledgerRows.length) await InventoryLedgerModel.insertMany(ledgerRows);

  dispatch.status = "posted";
  dispatch.dispatchedAt = new Date();
  dispatch.ledgerPosting = { postingState: "posted", postingKey: `dispatch:${dispatch._id}`, postedAt: new Date() };
  dispatch.statusHistory.push({ status: "posted", changedBy: uidFrom(req), note: "Company stock dispatched" });
  await dispatch.save();

  let invoice = await CompanyInvoiceModel.findOne({ companySalesOrderId: order._id, companyId, status: { $ne: "void" } });
  if (!invoice) {
    const totals = order.totals || calculateTotals(order.lines || []);
    invoice = await CompanyInvoiceModel.create({
      companyId,
      documentNo: makeDocNo("CINV"),
      ownerType: "company",
      ownerId: companyId,
      distributorId: order.distributorId,
      distributor: order.distributor,
      companySalesOrderId: order._id,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "posted",
      paymentStatus: "unpaid",
      invoiceTotal: toMoney(totals.grandTotal || 0),
      balanceAmount: toMoney(totals.grandTotal || 0),
      lines: order.lines,
      totals,
      ledgerPosting: { postingState: "posted", postingKey: `invoice:${order._id}`, postedAt: new Date() },
      createdByUserId: uidFrom(req),
      statusHistory: [{ status: "posted", changedBy: uidFrom(req), note: "Invoice generated from posted dispatch" }],
    });
  }

  let stockReceipt = await DistributorStockReceiptModel.findOne({ sourceDispatchId: dispatch._id, companyId, status: { $ne: "reversed" } });
  if (!stockReceipt) {
    stockReceipt = await DistributorStockReceiptModel.create({
      companyId,
      documentNo: makeDocNo("DSR"),
      ownerType: "distributor",
      ownerId: order.distributorId,
      distributorId: order.distributorId,
      sourceDispatchId: dispatch._id,
      receivedAtWarehouse: order.receiveAtWarehouse || { partyType: "warehouse", partyId: order.distributorId, partyName: `${order.distributor?.partyName || "Distributor"} Warehouse` },
      status: "draft",
      lines: dispatch.lines,
      createdByUserId: uidFrom(req),
      statusHistory: [{ status: "draft", changedBy: uidFrom(req), note: "Distributor receipt draft created from company dispatch" }],
    });
  }

  order.status = "dispatched";
  order.financialStatus = invoice.paymentStatus || "unpaid";
  order.statusHistory.push({ status: "dispatched", changedBy: uidFrom(req), note: `Dispatch ${dispatch.documentNo} posted and invoice ${invoice.documentNo} generated` });
  await order.save();
  return { order, dispatch, invoice, stockReceipt };
}

async function postDistributorReceipt(req) {
  const { DistributorStockReceiptModel, CompanyDispatchNoteModel, CompanySalesOrderModel, InventoryLedgerModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const receipt = await DistributorStockReceiptModel.findOne({ _id: req.params.id, companyId });
  if (!receipt) throw new Error("Distributor stock receipt not found");
  if (receipt.status !== "draft") throw new Error(`Distributor receipt is already ${receipt.status}.`);
  const dispatch = await CompanyDispatchNoteModel.findOne({ _id: receipt.sourceDispatchId, companyId });
  if (!dispatch || dispatch.status !== "posted") throw new Error("Company dispatch must be posted before distributor receipt can be posted.");
  const warehouseId = receipt.receivedAtWarehouse?.partyId || receipt.distributorId;
  const rows = [];
  for (const rawLine of receipt.lines || []) {
    const line = normalizeLine(rawLine);
    const qty = Number(line.receivedQty || line.dispatchedQty || line.qty || 0);
    if (qty <= 0) continue;
    rows.push({
      companyId,
      ownerType: "distributor",
      ownerId: receipt.distributorId,
      distributorId: receipt.distributorId,
      warehouseId,
      warehouseName: receipt.receivedAtWarehouse?.partyName || "Distributor Warehouse",
      productId: line.productId,
      productCode: line.productCode,
      productName: line.productName,
      batchNo: line.batchNo,
      movementType: "distributor_receipt",
      direction: "in",
      qty,
      unitCost: Number(line.unitCost || line.unitPrice || 0),
      totalValue: toMoney(qty * Number(line.unitCost || line.unitPrice || 0)),
      referenceType: "DistributorStockReceipt",
      referenceId: receipt._id,
      referenceNo: receipt.documentNo,
      postedByUserId: uidFrom(req),
    });
  }
  if (rows.length) await InventoryLedgerModel.insertMany(rows);
  receipt.status = "posted";
  receipt.receivedAt = new Date();
  receipt.ledgerPosting = { postingState: "posted", postingKey: `distributor-receipt:${receipt._id}`, postedAt: new Date() };
  receipt.statusHistory.push({ status: "posted", changedBy: uidFrom(req), note: "Distributor stock posted" });
  await receipt.save();
  const order = await CompanySalesOrderModel.findOne({ _id: dispatch.companySalesOrderId, companyId });
  if (order) {
    order.status = "received";
    order.statusHistory.push({ status: "received", changedBy: uidFrom(req), note: `Distributor receipt ${receipt.documentNo} posted` });
    await order.save();
  }
  return { receipt, order };
}

async function listDispatches(req) {
  const { CompanyDispatchNoteModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.status && req.query.status !== "all") filter.status = asText(req.query.status);
  return CompanyDispatchNoteModel.find(filter).sort({ createdAt: -1 }).lean();
}

async function listInvoices(req) {
  const { CompanyInvoiceModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.distributorId) filter.distributorId = asText(req.query.distributorId);
  return CompanyInvoiceModel.find(filter).sort({ createdAt: -1 }).lean();
}

async function listDistributorReceipts(req) {
  const { DistributorStockReceiptModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.status && req.query.status !== "all") filter.status = asText(req.query.status);
  return DistributorStockReceiptModel.find(filter).sort({ createdAt: -1 }).lean();
}

async function listCustomers(req) {
  const { UserModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  return UserModel.find({ companyId, $or: [{ role: /customer/i }, { portalType: /customer/i }, { customerId: { $exists: true, $ne: "" } }] })
    .select("_id userId username fullName mobile mobileNumber phoneNumber email status customerId customerName address shopAddress distributorId salesmanId orderBookerId")
    .sort({ fullName: 1, username: 1 })
    .limit(1000)
    .lean()
    .catch(() => []);
}
function distributorIdFromRequest(req) {
  return asText(req.query.distributorId || req.body?.distributorId || req.user?.distributorId || req.user?._id || req.user?.uid || req.user?.userId);
}
async function listDistributorProducts(req) {
  const { InventoryLedgerModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const distributorId = distributorIdFromRequest(req);
  const match = { companyId, ownerType: "distributor" };
  if (distributorId) match.ownerId = distributorId;
  const rows = await InventoryLedgerModel.aggregate([
    { $match: match },
    { $group: { _id: { ownerId: "$ownerId", warehouseId: "$warehouseId", productId: "$productId", productCode: "$productCode", productName: "$productName" }, inQty: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$qty", 0] } }, outQty: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$qty", 0] } }, unitCost: { $last: "$unitCost" } } },
    { $project: { _id: 0, distributorId: "$_id.ownerId", warehouseId: "$_id.warehouseId", productId: "$_id.productId", productCode: "$_id.productCode", productName: "$_id.productName", availableQty: { $subtract: ["$inQty", "$outQty"] }, unitCost: 1 } },
    { $match: { availableQty: { $gt: 0 } } },
    { $sort: { productName: 1 } },
  ]).catch(() => []);
  return rows;
}
async function listSecondaryOrders(req) {
  const { SecondaryOrderModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  const distributorId = distributorIdFromRequest(req);
  if (distributorId && req.query.scope !== "all") filter.distributorId = distributorId;
  if (req.query.status && req.query.status !== "all") filter.status = asText(req.query.status);
  return SecondaryOrderModel.find(filter).sort({ createdAt: -1 }).lean();
}
async function createSecondaryOrder(req) {
  const { SecondaryOrderModel, UserModel } = await scoped(req);
  const body = req.body || {};
  const companyId = companyIdFrom(req);
  const distributorId = asText(body.distributorId || req.user?.distributorId || req.user?._id || req.user?.uid || req.user?.userId);
  if (!distributorId) throw new Error("Distributor is required for secondary sales.");
  const customerId = asText(body.customerId || body.customer?.partyId);
  if (!customerId) throw new Error("Select customer before creating a secondary sales order.");
  const customerDoc = await UserModel.findOne({ companyId, $or: [{ _id: customerId }, { userId: customerId }, { customerId }] }).lean().catch(() => null);
  const customer = customerSnapshot(body.customer || customerDoc || { partyId: customerId, partyName: body.customerName });
  const lines = normalizeLines(body.lines || []);
  if (!lines.length) throw new Error("Add at least one product line.");
  const totals = calculateTotals(lines, body.totals || {});
  return SecondaryOrderModel.create({
    companyId, companyName: asText(req.user?.companyName), documentNo: asText(body.documentNo || makeDocNo("SSO")), ownerType: "distributor", ownerId: distributorId,
    distributorId, sourceType: asText(body.sourceType || "customer"), customer, orderBookerUserId: asText(body.orderBookerUserId || req.user?.orderBookerId), salesmanUserId: asText(body.salesmanUserId || req.user?.salesmanId),
    status: asText(body.status || "submitted"), financialStatus: "not_invoiced", dispatchStatus: "not_dispatched", lines, totals, createdByUserId: uidFrom(req), notes: asText(body.notes),
    statusHistory: [{ status: asText(body.status || "submitted"), changedBy: uidFrom(req), note: "Secondary sales order created" }],
  });
}
async function approveSecondaryOrder(req) {
  const { SecondaryOrderModel } = await scoped(req);
  const order = await SecondaryOrderModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!order) throw new Error("Secondary sales order not found");
  if (!["draft", "submitted"].includes(order.status)) throw new Error("Cannot approve secondary order because it is " + order.status + ".");
  order.status = "approved";
  order.approvedByUserId = uidFrom(req);
  order.statusHistory.push({ status: "approved", changedBy: uidFrom(req), note: "Approved for customer delivery" });
  return order.save();
}
async function fulfillSecondaryOrder(req) {
  const { SecondaryOrderModel, CustomerInvoiceModel, InventoryLedgerModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const order = await SecondaryOrderModel.findOne({ _id: req.params.id, companyId });
  if (!order) throw new Error("Secondary sales order not found");
  if (order.status === "delivered" || order.status === "invoiced" || order.dispatchStatus === "delivered") {
    const existingInvoice = await CustomerInvoiceModel.findOne({ secondaryOrderId: order._id, companyId, status: { $ne: "void" } });
    return { order, invoice: existingInvoice, message: "Secondary order was already delivered/invoiced." };
  }
  if (!["approved", "reserved"].includes(order.status)) throw new Error("Approve the secondary order before delivery/invoice posting.");
  const distributorId = order.distributorId;
  const warehouseId = asText(req.body?.warehouseId || distributorId);
  for (const rawLine of order.lines || []) {
    const line = normalizeLine(rawLine);
    const qty = Number(line.qty || 0);
    if (qty <= 0) continue;
    const available = await stockBalanceForOwner(InventoryLedgerModel, { companyId, ownerType: "distributor", ownerId: distributorId, warehouseId, line });
    if (available < qty) throw new Error("Not enough distributor stock for " + line.productName + ". Available " + available + ", required " + qty + ".");
  }
  const alreadyPosted = await InventoryLedgerModel.countDocuments({ companyId, referenceType: "SecondaryOrder", referenceId: order._id });
  if (!alreadyPosted) {
    const rows = (order.lines || []).map((rawLine) => {
      const line = normalizeLine(rawLine); const qty = Number(line.qty || 0);
      return { companyId, ownerType: "distributor", ownerId: distributorId, distributorId, warehouseId, warehouseName: "Distributor stock", productId: line.productId, productCode: line.productCode, productName: line.productName, batchNo: line.batchNo, movementType: "secondary_dispatch", direction: "out", qty, unitCost: Number(line.unitCost || line.unitPrice || 0), totalValue: toMoney(qty * Number(line.unitCost || line.unitPrice || 0)), referenceType: "SecondaryOrder", referenceId: order._id, referenceNo: order.documentNo, postedByUserId: uidFrom(req) };
    }).filter((row) => row.qty > 0);
    if (rows.length) await InventoryLedgerModel.insertMany(rows);
  }
  let invoice = await CustomerInvoiceModel.findOne({ secondaryOrderId: order._id, companyId, status: { $ne: "void" } });
  if (!invoice) {
    const total = Number(order.totals?.grandTotal || 0);
    invoice = await CustomerInvoiceModel.create({ companyId, documentNo: makeDocNo("CUSTINV"), ownerType: "distributor", ownerId: distributorId, distributorId, customer: order.customer, secondaryOrderId: order._id, invoiceDate: new Date(), dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), status: "posted", paymentStatus: total > 0 ? "unpaid" : "paid", invoiceTotal: total, balanceAmount: total, lines: order.lines, totals: order.totals, ledgerPosting: { postingState: "posted", postingKey: "customer-invoice:" + order._id, postedAt: new Date() }, createdByUserId: uidFrom(req), statusHistory: [{ status: "posted", changedBy: uidFrom(req), note: "Customer invoice generated from secondary order delivery" }] });
  }
  order.status = "delivered";
  order.dispatchStatus = "delivered";
  order.financialStatus = invoice.paymentStatus || "unpaid";
  order.statusHistory.push({ status: "delivered", changedBy: uidFrom(req), note: "Delivered and customer invoice " + invoice.documentNo + " generated" });
  await order.save();
  return { order, invoice };
}
async function listCustomerInvoices(req) {
  const { CustomerInvoiceModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  const distributorId = distributorIdFromRequest(req);
  if (distributorId && req.query.scope !== "all") filter.distributorId = distributorId;
  return CustomerInvoiceModel.find(filter).sort({ createdAt: -1 }).lean();
}
async function listCustomerReceipts(req) {
  const { CustomerReceiptModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  const distributorId = distributorIdFromRequest(req);
  if (distributorId && req.query.scope !== "all") filter.distributorId = distributorId;
  return CustomerReceiptModel.find(filter).sort({ createdAt: -1 }).lean();
}
async function payCustomerInvoice(req) {
  const { CustomerInvoiceModel, CustomerReceiptModel, SecondaryOrderModel } = await scoped(req);
  const invoice = await CustomerInvoiceModel.findOne({ _id: req.params.id, companyId: companyIdFrom(req) });
  if (!invoice) throw new Error("Customer invoice not found");
  if (invoice.status !== "posted") throw new Error("Only posted customer invoices can be paid.");
  const balance = Number(invoice.balanceAmount || 0);
  if (balance <= 0) throw new Error("Customer invoice is already paid.");
  const amount = Math.min(balance, toMoney(req.body?.amount || balance));
  if (amount <= 0) throw new Error("Receipt amount must be greater than zero.");
  const receipt = await CustomerReceiptModel.create({ companyId: invoice.companyId, documentNo: makeDocNo("CREC"), ownerType: "distributor", ownerId: invoice.distributorId, distributorId: invoice.distributorId, customer: invoice.customer, paymentDate: new Date(), amount, paymentMethod: asText(req.body?.paymentMethod || "cash"), status: "posted", allocations: [{ invoiceId: invoice._id, invoiceNo: invoice.documentNo, allocatedAmount: amount }], ledgerPosting: { postingState: "posted", postingKey: "customer-receipt:" + invoice._id + ":" + Date.now(), postedAt: new Date() }, createdByUserId: uidFrom(req), statusHistory: [{ status: "posted", changedBy: uidFrom(req), note: "Receipt posted against " + invoice.documentNo }] });
  invoice.allocatedReceiptTotal = toMoney(Number(invoice.allocatedReceiptTotal || 0) + amount);
  invoice.balanceAmount = toMoney(Math.max(0, Number(invoice.invoiceTotal || 0) - Number(invoice.allocatedReceiptTotal || 0)));
  invoice.paymentStatus = invoice.balanceAmount <= 0 ? "paid" : "partial";
  invoice.statusHistory.push({ status: invoice.paymentStatus, changedBy: uidFrom(req), note: "Customer receipt " + receipt.documentNo + " posted" });
  await invoice.save();
  const order = await SecondaryOrderModel.findOne({ _id: invoice.secondaryOrderId, companyId: invoice.companyId }).catch(() => null);
  if (order) { order.financialStatus = invoice.paymentStatus; await order.save(); }
  return { invoice, receipt };
}
async function secondaryOverview(req) {
  const { SecondaryOrderModel, CustomerInvoiceModel, CustomerReceiptModel } = await scoped(req);
  const companyId = companyIdFrom(req); const distributorId = distributorIdFromRequest(req);
  const filter = { companyId }; if (distributorId && req.query.scope !== "all") filter.distributorId = distributorId;
  const [orders, invoices, receipts, products, customers] = await Promise.all([SecondaryOrderModel.find(filter).sort({ createdAt: -1 }).limit(30).lean(), CustomerInvoiceModel.find(filter).sort({ createdAt: -1 }).limit(30).lean(), CustomerReceiptModel.find(filter).sort({ createdAt: -1 }).limit(30).lean(), listDistributorProducts(req), listCustomers(req)]);
  const invoiceTotal = invoices.reduce((sum, row) => sum + Number(row.invoiceTotal || 0), 0);
  const receivableBalance = invoices.reduce((sum, row) => sum + Number(row.balanceAmount || 0), 0);
  const receiptTotal = receipts.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return { orders, invoices, receipts, products, customers, kpis: { customers: customers.length, stockProducts: products.length, secondaryOrders: orders.length, approvedOrders: orders.filter((o) => o.status === "approved").length, deliveredOrders: orders.filter((o) => o.status === "delivered" || o.dispatchStatus === "delivered").length, invoiceTotal: toMoney(invoiceTotal), receivableBalance: toMoney(receivableBalance), receiptTotal: toMoney(receiptTotal) } };
}

async function overview(req) {
  const { CompanySalesOrderModel, CompanyDispatchNoteModel, CompanyInvoiceModel, DistributorStockReceiptModel, InventoryLedgerModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const [orders, dispatches, invoices, receipts, stockRows] = await Promise.all([
    CompanySalesOrderModel.find({ companyId }).sort({ createdAt: -1 }).limit(20).lean(),
    CompanyDispatchNoteModel.find({ companyId }).sort({ createdAt: -1 }).limit(20).lean(),
    CompanyInvoiceModel.find({ companyId }).sort({ createdAt: -1 }).limit(20).lean(),
    DistributorStockReceiptModel.find({ companyId }).sort({ createdAt: -1 }).limit(20).lean(),
    InventoryLedgerModel.aggregate([{ $match: { companyId, ownerType: "company" } }, { $group: { _id: null, inQty: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$qty", 0] } }, outQty: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$qty", 0] } } } }]).catch(() => []),
  ]);
  const invoiceTotal = invoices.reduce((sum, row) => sum + Number(row.invoiceTotal || 0), 0);
  const invoiceBalance = invoices.reduce((sum, row) => sum + Number(row.balanceAmount || 0), 0);
  const stock = stockRows?.[0] || {};
  return {
    orders,
    dispatches,
    invoices,
    receipts,
    kpis: {
      orders: orders.length,
      approvedOrders: orders.filter((o) => o.status === "approved").length,
      draftDispatches: dispatches.filter((d) => d.status === "draft").length,
      postedDispatches: dispatches.filter((d) => d.status === "posted").length,
      invoices: invoices.length,
      invoiceTotal: toMoney(invoiceTotal),
      invoiceBalance: toMoney(invoiceBalance),
      distributorReceiptDrafts: receipts.filter((r) => r.status === "draft").length,
      companyStockBalance: Number(stock.inQty || 0) - Number(stock.outQty || 0),
    },
  };
}

module.exports = {
  overview,
  listDistributors,
  listProducts,
  listWarehouses,
  listPrimaryOrders,
  createPrimaryOrder,
  approvePrimaryOrder,
  createDispatchFromOrder,
  postDispatch,
  postDistributorReceipt,
  listDispatches,
  listInvoices,
  listDistributorReceipts,
  listCustomers,
  listDistributorProducts,
  listSecondaryOrders,
  createSecondaryOrder,
  approveSecondaryOrder,
  fulfillSecondaryOrder,
  listCustomerInvoices,
  listCustomerReceipts,
  payCustomerInvoice,
  secondaryOverview,
};
