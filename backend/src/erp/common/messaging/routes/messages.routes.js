const express = require("express");
const mongoose = require("mongoose");
const Message = require("../models/Message");
const Company = require("../../../platform/companies/models/Company");
const { requireAuth } = require("../../../platform/auth/utils/auth");
const { toTenantDatabaseName } = require("../../../platform/tenancy/utils/tenantDatabases");

const router = express.Router();

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRoleScope(req) {
  const query = {};
  const userRole = String(req.user?.role || "").trim();
  const normalizedRole = userRole.toLowerCase();
  const isAdmin = ["admin", "system admin", "company admin"].includes(normalizedRole);

  if (req.query.recipientRole) {
    query.recipientRole = String(req.query.recipientRole);
    return query;
  }

  if (!isAdmin && userRole) {
    const roleRegex = new RegExp(`^${escapeRegExp(userRole)}$`, "i");
    query.$or = [{ recipientRole: roleRegex }, { senderRole: roleRegex }];
  }

  return query;
}

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function isSystemLevelAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
}

async function resolveTenantDbName(companyId, companyName = "") {
  const normalizedCompanyId = String(companyId || "").trim();
  const normalizedCompanyName = String(companyName || "").trim();
  if (!normalizedCompanyId && !normalizedCompanyName) return "";
  if (normalizedCompanyName) return toTenantDatabaseName(normalizedCompanyName, normalizedCompanyId || "company");
  const company = await Company.findOne({ companyId: normalizedCompanyId }).select("name").lean();
  return toTenantDatabaseName(company?.name || normalizedCompanyId, normalizedCompanyId || "company");
}

function getModelFromDb(db, baseModel) {
  const modelName = baseModel.modelName;
  return db.models[modelName] || db.model(modelName, baseModel.schema, baseModel.collection.name);
}

async function getScopedMessageModel(req, requestedCompanyId = "", requestedCompanyName = "") {
  const scopedCompanyId = isSystemLevelAdmin(req.user?.role)
    ? String(requestedCompanyId || "").trim()
    : String(req.user?.companyId || "").trim();
  const scopedCompanyName = isSystemLevelAdmin(req.user?.role)
    ? String(requestedCompanyName || "").trim()
    : String(req.user?.companyName || "").trim();
  if (!scopedCompanyId) return Message;
  const dbName = await resolveTenantDbName(scopedCompanyId, scopedCompanyName);
  if (!dbName) return Message;
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return getModelFromDb(tenantDb, Message);
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const MessageModel = await getScopedMessageModel(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const body = req.body || {};
    const doc = await MessageModel.create({
      title: String(body.title || "").trim(),
      body: String(body.body || "").trim(),
      type: String(body.type || "general").trim(),
      priority: String(body.priority || "normal").trim(),
      senderUserId: req.user?.uid,
      senderName: String(body.senderName || "").trim(),
      senderRole: String(body.senderRole || "").trim(),
      recipientRole: String(body.recipientRole || "").trim(),
      relatedEntity: String(body.relatedEntity || "").trim(),
    });
    return res.status(201).json({ ok: true, message: doc });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to create message" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const MessageModel = await getScopedMessageModel(req, req.query?.companyId, req.query?.companyName);
    const query = buildRoleScope(req);
    const uid = String(req.user?.uid || "");

    if (String(req.query.unreadOnly || "") === "1" && uid) {
      query.readByUserIds = { $nin: [uid] };
    }

    const items = await MessageModel.find(query).sort({ createdAt: -1 }).lean();
    return res.json({
      ok: true,
      messages: items.map((item) => ({
        ...item,
        isRead: uid ? (item.readByUserIds || []).includes(uid) : false,
      })),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load messages" });
  }
});

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const MessageModel = await getScopedMessageModel(req, req.query?.companyId, req.query?.companyName);
    const query = buildRoleScope(req);
    const uid = String(req.user?.uid || "");
    if (uid) {
      query.readByUserIds = { $nin: [uid] };
    }

    const unread = await MessageModel.countDocuments(query);
    return res.json({ ok: true, unread });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load message summary" });
  }
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const MessageModel = await getScopedMessageModel(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const uid = String(req.user?.uid || "");
    if (!uid) {
      return res.status(400).json({ ok: false, message: "Invalid user" });
    }

    const updated = await MessageModel.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { readByUserIds: uid } },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ ok: false, message: "Message not found" });
    }

    return res.json({ ok: true, message: updated });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to mark message as read" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const MessageModel = await getScopedMessageModel(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
    const role = normalizeRole(req.user?.role);
    const isAdmin = ["admin", "system admin", "company admin"].includes(role);
    const uid = String(req.user?.uid || "");
    const current = await MessageModel.findById(req.params.id).lean();
    if (!current) return res.status(404).json({ ok: false, message: "Message not found" });

    const isSender = uid && String(current.senderUserId || "") === uid;
    if (!isAdmin && !isSender) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }

    await MessageModel.findByIdAndDelete(req.params.id);
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to delete message" });
  }
});

module.exports = router;