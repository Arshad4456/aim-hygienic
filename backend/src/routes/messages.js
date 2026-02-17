const express = require("express");
const Message = require("../models/Message");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await Message.create({
      title: String(body.title || "").trim(),
      body: String(body.body || "").trim(),
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
    const query = {};
    const userRole = String(req.user?.role || "").trim();
    const isAdmin = userRole.toLowerCase() === "admin";

    if (req.query.recipientRole) {
      query.recipientRole = String(req.query.recipientRole);
    } else if (!isAdmin && userRole) {
      const roleRegex = new RegExp(`^${escapeRegExp(userRole)}$`, "i");
      query.$or = [{ recipientRole: roleRegex }, { senderRole: roleRegex }];
    }

    const items = await Message.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, messages: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load messages" });
  }
});

module.exports = router;
