const express = require("express");
const Message = require("../models/Message");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRoleScope(req) {
  const query = {};
  const userRole = String(req.user?.role || "").trim();
  const isAdmin = userRole.toLowerCase() === "admin";

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

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await Message.create({
      title: String(body.title || "").trim(),
      body: String(body.body || "").trim(),
      type: String(body.type || "general").trim(),
      priority: String(body.priority || "normal").trim(),
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
    const query = buildRoleScope(req);
    const uid = String(req.user?.uid || "");

    if (String(req.query.unreadOnly || "") === "1" && uid) {
      query.readByUserIds = { $nin: [uid] };
    }

    const items = await Message.find(query).sort({ createdAt: -1 }).lean();
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
    const query = buildRoleScope(req);
    const uid = String(req.user?.uid || "");
    if (uid) {
      query.readByUserIds = { $nin: [uid] };
    }

    const unread = await Message.countDocuments(query);
    return res.json({ ok: true, unread });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load message summary" });
  }
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  try {
    const uid = String(req.user?.uid || "");
    if (!uid) {
      return res.status(400).json({ ok: false, message: "Invalid user" });
    }

    const updated = await Message.findByIdAndUpdate(
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

module.exports = router;