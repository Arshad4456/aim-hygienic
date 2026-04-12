const SecondaryOrder = require("../../models/SecondaryOrder");
const { getScopedModels, asText, normalizeRole } = require("../scopedModels");

async function getModels(req) {
  return getScopedModels(req, {
    SecondaryOrderModel: SecondaryOrder,
  });
}

function buildRoleScopedQuery(req) {
  const role = normalizeRole(req.user?.role);
  const companyId = asText(req.user?.companyId);
  const distributorId = asText(req.user?.distributorId);
  const uid = asText(req.user?.uid);

  const query = { companyId };

  if (role === "distributor") {
    query.distributorId = distributorId || uid;
  } else if (role === "salesman") {
    query.salesmanUserId = uid;
  } else if (role === "customer") {
    query["customer.partyId"] = uid;
  } else if (role === "order booker" || role === "orderbooker") {
    query.orderBookerUserId = uid;
  }

  return query;
}

async function list(req) {
  const { SecondaryOrderModel } = await getModels(req);
  const query = buildRoleScopedQuery(req);

  if (req.query.status && req.query.status !== "all") {
    query.status = asText(req.query.status);
  }

  return SecondaryOrderModel.find(query).sort({ createdAt: -1 }).lean();
}

async function create(req) {
  const { SecondaryOrderModel } = await getModels(req);
  const body = req.body || {};
  const role = normalizeRole(req.user?.role);
  const distributorId = asText(body.distributorId || req.user?.distributorId);

  return SecondaryOrderModel.create({
    companyId: asText(req.user.companyId),
    companyName: asText(req.user.companyName),
    documentNo: body.documentNo,
    ownerId: distributorId,
    distributorId,
    sourceType:
      role === "order booker" || role === "orderbooker"
        ? "order_booker"
        : role === "salesman"
        ? "salesman"
        : "customer",
    customer: body.customer,
    orderBookerUserId: role.includes("order") ? asText(req.user.uid) : asText(body.orderBookerUserId),
    salesmanUserId: asText(body.salesmanUserId),
    territoryId: asText(body.territoryId),
    fieldId: asText(body.fieldId),
    status: role === "distributor" ? "approved" : "submitted",
    lines: Array.isArray(body.lines) ? body.lines : [],
    totals: body.totals || {},
    statusHistory: [{ status: role === "distributor" ? "approved" : "submitted", changedBy: asText(req.user.uid) }],
    createdByUserId: asText(req.user.uid),
    notes: asText(body.notes),
  });
}

async function approve(req) {
  const { SecondaryOrderModel } = await getModels(req);
  const order = await SecondaryOrderModel.findById(req.params.id);
  if (!order) throw new Error("Secondary order not found");

  order.status = "approved";
  order.statusHistory.push({ status: "approved", changedBy: asText(req.user.uid), note: "Approved" });
  await order.save();
  return order;
}

module.exports = {
  list,
  create,
  approve,
};