const mongoose = require("mongoose");

const NotificationChannelStatusSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ["in_app", "push", "sms", "whatsapp", "email"], required: true },
    status: { type: String, enum: ["pending", "queued", "sent", "provider_not_configured", "failed"], default: "pending" },
    provider: { type: String, trim: true },
    providerMessageId: { type: String, trim: true },
    error: { type: String, trim: true },
    sentAt: Date,
    deliveredAt: Date,
  },
  { _id: false }
);

const NotificationSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, index: true },
    companyName: { type: String, trim: true },
    title: { type: String, trim: true, required: true },
    body: { type: String, trim: true, required: true },
    module: { type: String, trim: true, default: "general", index: true },
    eventType: { type: String, trim: true, default: "manual", index: true },
    relatedEntity: { type: String, trim: true },
    priority: { type: String, enum: ["low", "normal", "high", "critical"], default: "normal", index: true },
    audience: { type: String, enum: ["all", "role", "user", "mobile", "external"], default: "all", index: true },
    recipientUserId: { type: String, trim: true, index: true },
    recipientRole: { type: String, trim: true, index: true },
    recipientName: { type: String, trim: true },
    recipientMobile: { type: String, trim: true },
    recipientEmail: { type: String, trim: true },
    channels: [{ type: String, enum: ["in_app", "push", "sms", "whatsapp", "email"], default: "in_app" }],
    channelStatuses: [NotificationChannelStatusSchema],
    status: { type: String, enum: ["draft", "queued", "sent", "partial", "failed", "read"], default: "queued", index: true },
    readByUserIds: [{ type: String, trim: true }],
    readAt: Date,
    createdByUserId: { type: String, trim: true },
    createdByName: { type: String, trim: true },
    scheduledFor: Date,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

NotificationSchema.index({ companyId: 1, createdAt: -1 });
NotificationSchema.index({ recipientUserId: 1, createdAt: -1 });
NotificationSchema.index({ recipientRole: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
