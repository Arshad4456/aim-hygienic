const BillOfMaterial = require("../../bom/models/BillOfMaterial");
const ProductionOrder = require("../models/ProductionOrder");
const QualityCheck = require("../../quality-control/models/QualityCheck");
const MachineMaintenance = require("../../maintenance/models/MachineMaintenance");
const Product = require("../../../common/products/models/Product");
const Warehouse = require("../../../common/warehouse/models/Warehouse");
const InventoryLedger = require("../../../common/inventory/models/InventoryLedger");
const { asText, getScopedModels, scopedCompanyId } = require("../../../platform/tenancy/services/scopedModels");

function companyIdFrom(req) { return scopedCompanyId(req); }
function uidFrom(req) { return asText(req.user?.uid || req.user?._id || req.user?.userId); }
function n(value) { const num = Number(value); return Number.isFinite(num) ? num : 0; }
function money(value) { return Math.round(Number(value || 0) * 100) / 100; }
function docNo(prefix) { return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-6)}`; }
function statusEntry(status, userId, note = "") { return { status, changedBy: userId, changedAt: new Date(), note }; }

async function scoped(req) {
  return getScopedModels(req, {
    BillOfMaterialModel: BillOfMaterial,
    ProductionOrderModel: ProductionOrder,
    QualityCheckModel: QualityCheck,
    MachineMaintenanceModel: MachineMaintenance,
    ProductModel: Product,
    WarehouseModel: Warehouse,
    InventoryLedgerModel: InventoryLedger,
  });
}

async function resolveProduct(ProductModel, companyId, raw = {}) {
  const key = asText(raw.productId || raw.finishedProductId || raw.productCode || raw.sku);
  let product = null;
  if (key) {
    const or = [{ productId: key }, { code: key }, { sku: key }];
    if (/^[a-f\d]{24}$/i.test(key)) or.push({ _id: key });
    product = await ProductModel.findOne({ companyId, $or: or }).lean().catch(() => null);
  }
  if (!product && (raw.productName || raw.finishedProductName)) product = await ProductModel.findOne({ companyId, name: asText(raw.productName || raw.finishedProductName) }).lean().catch(() => null);
  if (!product && !asText(raw.productName || raw.finishedProductName)) throw new Error("Product is required.");
  return {
    product,
    productId: asText(product?.productId || product?._id || raw.productId || raw.finishedProductId),
    productCode: asText(product?.code || product?.sku || raw.productCode),
    productName: asText(product?.name || raw.productName || raw.finishedProductName),
    uom: asText(raw.uom || product?.unit || "unit"),
    unitCost: money(raw.unitCost ?? product?.costPrice ?? product?.tradePrice ?? 0),
  };
}

async function resolveWarehouse(WarehouseModel, companyId, raw = {}, prefix = "") {
  const key = asText(raw[`${prefix}WarehouseId`] || raw.warehouseId);
  const name = asText(raw[`${prefix}WarehouseName`] || raw.warehouseName);
  let warehouse = null;
  if (key) {
    const or = [{ warehouseId: key }];
    if (/^[a-f\d]{24}$/i.test(key)) or.push({ _id: key });
    warehouse = await WarehouseModel.findOne({ companyId, $or: or }).lean().catch(() => null);
  }
  if (!warehouse && name) warehouse = await WarehouseModel.findOne({ companyId, name }).lean().catch(() => null);
  return { warehouseId: asText(warehouse?.warehouseId || warehouse?._id || key || "main"), warehouseName: asText(warehouse?.name || name || "Main Warehouse") };
}

function materialLine(raw, product, lineNo, multiplier = 1) {
  const qty = n(raw.qty || raw.quantity || 1) * multiplier;
  if (qty <= 0) throw new Error("Material quantity must be greater than zero.");
  const unitCost = money(raw.unitCost ?? product.unitCost);
  return {
    lineNo,
    productId: product.productId,
    productCode: product.productCode,
    productName: product.productName,
    uom: product.uom,
    qty,
    unitCost,
    unitPrice: 0,
    netLineAmount: money(qty * unitCost),
    batchNo: asText(raw.batchNo),
    notes: asText(raw.notes),
  };
}

function totalMaterialCost(lines = []) { return money(lines.reduce((sum, line) => sum + n(line.netLineAmount || n(line.qty) * n(line.unitCost)), 0)); }

async function availableQty(InventoryLedgerModel, companyId, warehouseId, productId, batchNo = "") {
  const match = { companyId, ownerType: "company", ownerId: companyId, warehouseId, productId };
  if (batchNo) match.batchNo = batchNo;
  const rows = await InventoryLedgerModel.aggregate([
    { $match: match },
    { $group: { _id: null, inQty: { $sum: { $cond: [{ $eq: ["$direction", "in"] }, "$qty", 0] } }, outQty: { $sum: { $cond: [{ $eq: ["$direction", "out"] }, "$qty", 0] } } } },
    { $project: { _id: 0, balanceQty: { $subtract: ["$inQty", "$outQty"] } } },
  ]).catch(() => []);
  return n(rows[0]?.balanceQty);
}

async function createLedger(req, payload) {
  const { InventoryLedgerModel } = await scoped(req);
  return InventoryLedgerModel.create({
    companyId: payload.companyId || companyIdFrom(req),
    ownerType: "company",
    ownerId: payload.companyId || companyIdFrom(req),
    warehouseId: payload.warehouseId,
    warehouseName: payload.warehouseName,
    productId: payload.productId,
    productCode: payload.productCode,
    productName: payload.productName,
    batchNo: payload.batchNo,
    movementType: payload.movementType,
    direction: payload.direction,
    qty: n(payload.qty),
    unitCost: money(payload.unitCost),
    totalValue: money(n(payload.qty) * n(payload.unitCost)),
    referenceType: payload.referenceType,
    referenceId: payload.referenceId,
    referenceNo: payload.referenceNo,
    postedAt: new Date(),
    postedByUserId: uidFrom(req),
  });
}

async function listProducts(req) {
  const { ProductModel } = await scoped(req);
  return ProductModel.find({ companyId: companyIdFrom(req) }).sort({ name: 1 }).limit(600).lean().catch(() => []);
}

async function listWarehouses(req) {
  const { WarehouseModel } = await scoped(req);
  return WarehouseModel.find({ companyId: companyIdFrom(req) }).sort({ name: 1 }).limit(200).lean().catch(() => []);
}

async function listBoms(req) {
  const { BillOfMaterialModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.status) filter.status = asText(req.query.status);
  if (req.query.finishedProductId) filter.finishedProductId = asText(req.query.finishedProductId);
  return BillOfMaterialModel.find(filter).sort({ updatedAt: -1 }).limit(400).lean();
}

async function createBom(req) {
  const { BillOfMaterialModel, ProductModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  if (!companyId) throw new Error("Company is required.");
  const finished = await resolveProduct(ProductModel, companyId, { productId: req.body?.finishedProductId, productCode: req.body?.finishedProductCode, productName: req.body?.finishedProductName, uom: req.body?.uom });
  const rawMaterials = Array.isArray(req.body?.materials) ? req.body.materials : [];
  if (!rawMaterials.length) throw new Error("BOM requires at least one raw material.");
  const materials = [];
  for (let i = 0; i < rawMaterials.length; i += 1) {
    const product = await resolveProduct(ProductModel, companyId, rawMaterials[i]);
    materials.push(materialLine(rawMaterials[i], product, i + 1));
  }
  const outputQty = Math.max(1, n(req.body?.outputQty || 1));
  const estimatedCost = money((totalMaterialCost(materials) + n(req.body?.laborCost) + n(req.body?.overheadCost)) / outputQty);
  const bom = await BillOfMaterialModel.create({
    companyId,
    bomNo: asText(req.body?.bomNo) || docNo("BOM"),
    finishedProductId: finished.productId,
    finishedProductCode: finished.productCode,
    finishedProductName: finished.productName,
    outputQty,
    uom: finished.uom,
    version: asText(req.body?.version || "1.0"),
    routingSteps: Array.isArray(req.body?.routingSteps) ? req.body.routingSteps : [],
    materials,
    laborCost: money(req.body?.laborCost),
    overheadCost: money(req.body?.overheadCost),
    estimatedUnitCost: estimatedCost,
    status: asText(req.body?.status || "active"),
    statusHistory: [statusEntry(asText(req.body?.status || "active"), uidFrom(req), "BOM created")],
    createdByUserId: uidFrom(req),
    notes: asText(req.body?.notes),
  });
  return { bom };
}

async function listProductionOrders(req) {
  const { ProductionOrderModel } = await scoped(req);
  const filter = { companyId: companyIdFrom(req) };
  if (req.query.status) filter.status = asText(req.query.status);
  return ProductionOrderModel.find(filter).sort({ createdAt: -1 }).limit(400).lean();
}

async function createProductionOrder(req) {
  const { ProductionOrderModel, BillOfMaterialModel, ProductModel, WarehouseModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  if (!companyId) throw new Error("Company is required.");
  let bom = null;
  if (req.body?.bomId) bom = await BillOfMaterialModel.findOne({ _id: req.body.bomId, companyId }).lean();
  if (!bom && req.body?.bomNo) bom = await BillOfMaterialModel.findOne({ bomNo: asText(req.body.bomNo), companyId }).lean();
  const finished = bom
    ? { productId: bom.finishedProductId, productCode: bom.finishedProductCode, productName: bom.finishedProductName, uom: bom.uom, unitCost: bom.estimatedUnitCost }
    : await resolveProduct(ProductModel, companyId, { productId: req.body?.finishedProductId, productName: req.body?.finishedProductName });
  const plannedQty = n(req.body?.plannedQty || req.body?.qty || 1);
  if (plannedQty <= 0) throw new Error("Planned quantity must be greater than zero.");
  const rawWarehouse = await resolveWarehouse(WarehouseModel, companyId, req.body || {}, "rawMaterial");
  const fgWarehouse = await resolveWarehouse(WarehouseModel, companyId, req.body || {}, "finishedGoods");
  const multiplier = bom ? plannedQty / Math.max(1, n(bom.outputQty)) : 1;
  const materials = Array.isArray(req.body?.materials) && req.body.materials.length
    ? req.body.materials
    : (bom?.materials || []).map((line) => ({ ...line, qty: n(line.qty) * multiplier }));
  const normalizedMaterials = [];
  for (let i = 0; i < materials.length; i += 1) {
    const product = await resolveProduct(ProductModel, companyId, materials[i]);
    normalizedMaterials.push(materialLine(materials[i], product, i + 1));
  }
  const estimatedCost = money(totalMaterialCost(normalizedMaterials) + n(req.body?.laborCost) + n(req.body?.overheadCost));
  const order = await ProductionOrderModel.create({
    companyId,
    documentNo: asText(req.body?.documentNo) || docNo("PROD"),
    bomId: bom?._id,
    bomNo: bom?.bomNo,
    finishedProductId: finished.productId,
    finishedProductCode: finished.productCode,
    finishedProductName: finished.productName,
    plannedQty,
    uom: finished.uom,
    rawMaterialWarehouseId: rawWarehouse.warehouseId,
    rawMaterialWarehouseName: rawWarehouse.warehouseName,
    finishedGoodsWarehouseId: fgWarehouse.warehouseId,
    finishedGoodsWarehouseName: fgWarehouse.warehouseName,
    startDate: req.body?.startDate ? new Date(req.body.startDate) : undefined,
    dueDate: req.body?.dueDate ? new Date(req.body.dueDate) : undefined,
    materials: normalizedMaterials,
    estimatedCost,
    actualCost: estimatedCost,
    status: "planned",
    statusHistory: [statusEntry("planned", uidFrom(req), "Production order planned")],
    createdByUserId: uidFrom(req),
    notes: asText(req.body?.notes),
  });
  return { productionOrder: order };
}

async function issueMaterials(req) {
  const { ProductionOrderModel, InventoryLedgerModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const order = await ProductionOrderModel.findOne({ _id: req.params.id, companyId });
  if (!order) throw new Error("Production order not found.");
  if (["materials_issued", "in_production", "quality_check", "completed"].includes(order.status)) return { productionOrder: order, alreadyIssued: true };
  for (const line of order.materials || []) {
    const available = await availableQty(InventoryLedgerModel, companyId, order.rawMaterialWarehouseId, line.productId, line.batchNo);
    if (available < n(line.qty) && req.body?.allowNegativeStock !== true) throw new Error(`Insufficient raw material for ${line.productName}. Available: ${available}`);
  }
  const ledger = [];
  for (const line of order.materials || []) {
    ledger.push(await createLedger(req, { companyId, warehouseId: order.rawMaterialWarehouseId, warehouseName: order.rawMaterialWarehouseName, productId: line.productId, productCode: line.productCode, productName: line.productName, batchNo: line.batchNo, movementType: "production_issue", direction: "out", qty: line.qty, unitCost: line.unitCost, referenceType: "production_order", referenceId: order._id, referenceNo: order.documentNo }));
  }
  order.status = "materials_issued";
  order.issuedAt = new Date();
  order.issuedByUserId = uidFrom(req);
  order.statusHistory.push(statusEntry("materials_issued", uidFrom(req), asText(req.body?.notes || "Raw materials issued")));
  await order.save();
  return { productionOrder: order, ledger };
}

async function receiveFinishedGoods(req) {
  const { ProductionOrderModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const order = await ProductionOrderModel.findOne({ _id: req.params.id, companyId });
  if (!order) throw new Error("Production order not found.");
  const producedQty = n(req.body?.producedQty || req.body?.qty || order.plannedQty);
  const rejectedQty = n(req.body?.rejectedQty);
  const scrapQty = n(req.body?.scrapQty);
  if (producedQty <= 0) throw new Error("Produced quantity must be greater than zero.");
  const unitCost = money(req.body?.unitCost || order.actualCost / Math.max(1, producedQty));
  const fgLedger = await createLedger(req, { companyId, warehouseId: order.finishedGoodsWarehouseId, warehouseName: order.finishedGoodsWarehouseName, productId: order.finishedProductId, productCode: order.finishedProductCode, productName: order.finishedProductName, movementType: "production_receipt", direction: "in", qty: producedQty, unitCost, referenceType: "production_order", referenceId: order._id, referenceNo: order.documentNo });
  const ledger = [fgLedger];
  if (scrapQty > 0) ledger.push(await createLedger(req, { companyId, warehouseId: order.finishedGoodsWarehouseId, warehouseName: order.finishedGoodsWarehouseName, productId: order.finishedProductId, productCode: order.finishedProductCode, productName: order.finishedProductName, movementType: "manufacturing_scrap", direction: "out", qty: scrapQty, unitCost, referenceType: "production_order", referenceId: order._id, referenceNo: order.documentNo }));
  order.producedQty = n(order.producedQty) + producedQty;
  order.rejectedQty = n(order.rejectedQty) + rejectedQty;
  order.scrapQty = n(order.scrapQty) + scrapQty;
  order.status = rejectedQty > 0 ? "quality_check" : "completed";
  order.receivedAt = new Date();
  order.receivedByUserId = uidFrom(req);
  order.completedAt = order.status === "completed" ? new Date() : order.completedAt;
  order.statusHistory.push(statusEntry(order.status, uidFrom(req), asText(req.body?.notes || "Finished goods received")));
  await order.save();
  return { productionOrder: order, ledger };
}

async function createQualityCheck(req) {
  const { QualityCheckModel, ProductionOrderModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  let order = null;
  if (req.body?.productionOrderId || req.params.id) order = await ProductionOrderModel.findOne({ _id: req.body.productionOrderId || req.params.id, companyId });
  const checkedQty = n(req.body?.checkedQty || order?.producedQty || 0);
  const passedQty = n(req.body?.passedQty || Math.max(0, checkedQty - n(req.body?.rejectedQty)));
  const rejectedQty = n(req.body?.rejectedQty || Math.max(0, checkedQty - passedQty));
  const result = rejectedQty <= 0 && passedQty > 0 ? "passed" : passedQty > 0 ? "partial" : "failed";
  const qc = await QualityCheckModel.create({
    companyId,
    documentNo: asText(req.body?.documentNo) || docNo("QC"),
    productionOrderId: order?._id,
    productionOrderNo: order?.documentNo,
    productId: order?.finishedProductId || asText(req.body?.productId),
    productName: order?.finishedProductName || asText(req.body?.productName),
    checkedQty,
    passedQty,
    rejectedQty,
    inspectorId: uidFrom(req),
    inspectorName: asText(req.user?.username || req.body?.inspectorName),
    result,
    checklist: Array.isArray(req.body?.checklist) ? req.body.checklist : [],
    attachmentUrl: asText(req.body?.attachmentUrl),
    statusHistory: [statusEntry(result, uidFrom(req), "Quality check recorded")],
    notes: asText(req.body?.notes),
  });
  if (order) {
    order.rejectedQty = n(order.rejectedQty) + rejectedQty;
    order.status = result === "passed" ? "completed" : "quality_check";
    if (order.status === "completed") order.completedAt = new Date();
    order.statusHistory.push(statusEntry(order.status, uidFrom(req), `QC ${result}`));
    await order.save();
  }
  return { qualityCheck: qc, productionOrder: order };
}

async function listQualityChecks(req) {
  const { QualityCheckModel } = await scoped(req);
  return QualityCheckModel.find({ companyId: companyIdFrom(req) }).sort({ checkDate: -1 }).limit(300).lean();
}

async function listMaintenance(req) {
  const { MachineMaintenanceModel } = await scoped(req);
  return MachineMaintenanceModel.find({ companyId: companyIdFrom(req) }).sort({ dueDate: 1, createdAt: -1 }).limit(300).lean();
}

async function createMaintenance(req) {
  const { MachineMaintenanceModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  if (!companyId) throw new Error("Company is required.");
  const item = await MachineMaintenanceModel.create({
    companyId,
    maintenanceNo: asText(req.body?.maintenanceNo) || docNo("MNT"),
    machineId: asText(req.body?.machineId),
    machineName: asText(req.body?.machineName || "Production Machine"),
    workCenter: asText(req.body?.workCenter),
    maintenanceType: asText(req.body?.maintenanceType || "preventive"),
    dueDate: req.body?.dueDate ? new Date(req.body.dueDate) : undefined,
    completedAt: req.body?.completedAt ? new Date(req.body.completedAt) : undefined,
    downtimeMinutes: n(req.body?.downtimeMinutes),
    cost: money(req.body?.cost),
    technicianName: asText(req.body?.technicianName),
    status: asText(req.body?.status || "scheduled"),
    attachmentUrl: asText(req.body?.attachmentUrl),
    notes: asText(req.body?.notes),
    createdByUserId: uidFrom(req),
  });
  return { maintenance: item };
}

async function overview(req) {
  const { BillOfMaterialModel, ProductionOrderModel, QualityCheckModel, MachineMaintenanceModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const [bomCount, openOrders, completedOrders, qcPending, maintenanceDue, recentOrders] = await Promise.all([
    BillOfMaterialModel.countDocuments({ companyId, status: "active" }).catch(() => 0),
    ProductionOrderModel.countDocuments({ companyId, status: { $in: ["planned", "materials_issued", "in_production", "quality_check"] } }).catch(() => 0),
    ProductionOrderModel.countDocuments({ companyId, status: "completed" }).catch(() => 0),
    QualityCheckModel.countDocuments({ companyId, result: { $in: ["pending", "partial", "failed"] } }).catch(() => 0),
    MachineMaintenanceModel.countDocuments({ companyId, status: { $in: ["scheduled", "in_progress"] } }).catch(() => 0),
    ProductionOrderModel.find({ companyId }).sort({ createdAt: -1 }).limit(10).lean().catch(() => []),
  ]);
  return { kpis: { bomCount, openOrders, completedOrders, qcPending, maintenanceDue }, recentOrders };
}

async function printDocument(req) {
  const { BillOfMaterialModel, ProductionOrderModel, QualityCheckModel, MachineMaintenanceModel } = await scoped(req);
  const companyId = companyIdFrom(req);
  const type = asText(req.params.type);
  let doc = null;
  if (type === "bom") doc = await BillOfMaterialModel.findOne({ _id: req.params.id, companyId }).lean();
  if (type === "production-order") doc = await ProductionOrderModel.findOne({ _id: req.params.id, companyId }).lean();
  if (type === "quality-check") doc = await QualityCheckModel.findOne({ _id: req.params.id, companyId }).lean();
  if (type === "maintenance") doc = await MachineMaintenanceModel.findOne({ _id: req.params.id, companyId }).lean();
  if (!doc) throw new Error("Manufacturing document not found.");
  return { type, document: doc };
}

module.exports = { overview, listProducts, listWarehouses, listBoms, createBom, listProductionOrders, createProductionOrder, issueMaterials, receiveFinishedGoods, createQualityCheck, listQualityChecks, listMaintenance, createMaintenance, printDocument };
