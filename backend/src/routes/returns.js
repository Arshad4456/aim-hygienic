const express = require("express");
const mongoose = require("mongoose");
const { requireAuth } = require("../utils/auth");
const ReturnClaim = require("../models/ReturnClaim");
const SalesOrder = require("../models/SalesOrder");
const Company = require("../models/Company");
const { toTenantDatabaseName } = require("../utils/tenantDatabases");

const router = express.Router();

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function isSystemLevelAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
}

function asText(value) {
  return String(value || "").trim();
}

async function resolveTenantDbName(companyId, companyName = "") {
  const normalizedCompanyId = asText(companyId);
  const normalizedCompanyName = asText(companyName);
  if (!normalizedCompanyId && !normalizedCompanyName) return "";
  if (normalizedCompanyName) return toTenantDatabaseName(normalizedCompanyName, normalizedCompanyId || "company");
  const company = await Company.findOne({ companyId: normalizedCompanyId }).select("name").lean();
  return toTenantDatabaseName(company?.name || normalizedCompanyId, normalizedCompanyId || "company");
}

function getModelFromDb(db, baseModel) {
  const modelName = baseModel.modelName;
  return db.models[modelName] || db.model(modelName, baseModel.schema, baseModel.collection.name);
}

async function getScopedReturnModels(req, requestedCompanyId = "", requestedCompanyName = "") {
  const scopedCompanyId = isSystemLevelAdmin(req.user?.role)
    ? asText(requestedCompanyId)
    : asText(req.user?.companyId);
  const scopedCompanyName = isSystemLevelAdmin(req.user?.role)
    ? asText(requestedCompanyName)
    : asText(req.user?.companyName);
  if (!scopedCompanyId) return { ReturnClaimModel: ReturnClaim, SalesOrderModel: SalesOrder };
  const dbName = await resolveTenantDbName(scopedCompanyId, scopedCompanyName);
  if (!dbName) return { ReturnClaimModel: ReturnClaim, SalesOrderModel: SalesOrder };
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return {
    ReturnClaimModel: getModelFromDb(tenantDb, ReturnClaim),
    SalesOrderModel: getModelFromDb(tenantDb, SalesOrder),
  };
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const { ReturnClaimModel } = await getScopedReturnModels(req, req.query?.companyId, req.query?.companyName);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const returns = await ReturnClaimModel.find().sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ ok: true, returns });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load returns" });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { ReturnClaimModel, SalesOrderModel } = await getScopedReturnModels(
      req,
      req.body?.companyId || req.query?.companyId,
      req.body?.companyName || req.query?.companyName
    );
    const { orderNo, customerName, reason, quantity, notes } = req.body || {};
    if (!orderNo || !customerName || !reason) {
      return res.status(400).json({ ok: false, message: "Order number, customer, and reason are required" });
    }

    const order = await SalesOrderModel.findOne({ orderNo: String(orderNo).trim() }).lean();
    const claim = await ReturnClaimModel.create({
      orderId: order?._id,
      orderNo: String(orderNo).trim(),
      customerName: String(customerName).trim(),
      reason: String(reason).trim(),
      quantity: Number(quantity || 0),
      notes: notes ? String(notes).trim() : undefined,
    });

    return res.status(201).json({ ok: true, claim });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to create return claim" });
  }
});

router.patch("/:id/status", requireAuth, async (req, res) => {
  try {
    const { ReturnClaimModel } = await getScopedReturnModels(
      req,
      req.body?.companyId || req.query?.companyId,
      req.body?.companyName || req.query?.companyName
    );
    const { status, notes } = req.body || {};
    const allowed = ["requested", "approved", "rejected", "resolved"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ ok: false, message: "Invalid status" });
    }

    const updates = { status };
    if (notes) updates.notes = String(notes).trim();

    const claim = await ReturnClaimModel.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!claim) {
      return res.status(404).json({ ok: false, message: "Return claim not found" });
    }
    return res.json({ ok: true, claim });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to update return claim" });
  }
});

module.exports = router;
