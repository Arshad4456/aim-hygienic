const CompanySalesOrder = require("../../models/CompanySalesOrder");
const CompanyDispatchNote = require("../../models/CompanyDispatchNote");
const { getScopedModels, asText } = require("../scopedModels");

async function getModels(req) {
  return getScopedModels(req, {
    CompanySalesOrderModel: CompanySalesOrder,
    CompanyDispatchNoteModel: CompanyDispatchNote,
  });
}

async function list(req) {
  const { CompanySalesOrderModel } = await getModels(req);
  const query = { companyId: asText(req.user.companyId) };

  if (req.query.status && req.query.status !== "all") {
    query.status = asText(req.query.status);
  }
  if (req.query.distributorId) {
    query.distributorId = asText(req.query.distributorId);
  }

  return CompanySalesOrderModel.find(query).sort({ createdAt: -1 }).lean();
}

async function create(req) {
  const { CompanySalesOrderModel } = await getModels(req);
  const body = req.body || {};

  return CompanySalesOrderModel.create({
    companyId: asText(req.user.companyId),
    companyName: asText(req.user.companyName),
    documentNo: body.documentNo, // later replace with numbering service
    ownerId: asText(req.user.companyId),
    distributorId: asText(body.distributorId),
    distributor: body.distributor,
    dispatchFromWarehouse: body.dispatchFromWarehouse,
    receiveAtWarehouse: body.receiveAtWarehouse,
    freightPayer: asText(body.freightPayer || "company"),
    deliveryMode: asText(body.deliveryMode || "company_truck"),
    lines: Array.isArray(body.lines) ? body.lines : [],
    totals: body.totals || {},
    status: "draft",
    statusHistory: [{ status: "draft", changedBy: asText(req.user.uid), note: "Created" }],
    createdByUserId: asText(req.user.uid),
    notes: asText(body.notes),
  });
}

async function approve(req) {
  const { CompanySalesOrderModel } = await getModels(req);
  const order = await CompanySalesOrderModel.findById(req.params.id);
  if (!order) throw new Error("Company sales order not found");

  order.status = "approved";
  order.approvedByUserId = asText(req.user.uid);
  order.statusHistory.push({ status: "approved", changedBy: asText(req.user.uid), note: "Approved" });
  await order.save();
  return order;
}

module.exports = {
  list,
  create,
  approve,
};